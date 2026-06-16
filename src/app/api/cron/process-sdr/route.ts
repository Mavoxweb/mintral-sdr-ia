import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { runLeadAnalyzer, runMessageGenerator } from "@/agents/agents";
import { sendWhatsAppMessage } from "@/lib/evolution";
import { Lead, Campaign } from "@/store/useStore";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;

    // 1. Fetch next lead in status 'Novo Lead' from an active campaign
    // Joint-query: leads that belong to a campaign that is active and campaign status is 'active'
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select(`
        *,
        campaigns:campaign_id (*)
      `)
      .eq("status", "Novo Lead")
      .eq("takeover_mode", "bot")
      .limit(1);

    if (leadsError) {
      throw leadsError;
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ message: "No pending leads to process" });
    }

    const rawLead = leads[0];
    // Cast and check campaign
    const associatedCampaign = rawLead.campaigns;
    if (!associatedCampaign || associatedCampaign.status !== "active") {
      // If no active campaign, skip
      return NextResponse.json({ message: "Lead has no active campaign associated" });
    }

    // Map lead to camelCase matching the frontend Lead model
    const lead: Lead = {
      id: rawLead.id,
      name: rawLead.name,
      company: rawLead.company,
      phone: rawLead.phone,
      city: rawLead.city,
      state: rawLead.state,
      category: rawLead.category,
      section: rawLead.section,
      rating: Number(rawLead.rating) || 0,
      numRatings: rawLead.num_ratings || 0,
      socialLink: rawLead.social_link || undefined,
      status: rawLead.status,
      enrichStatus: "idle",
      takeoverMode: (rawLead.takeover_mode as "bot" | "human") || "bot",
      notes: rawLead.notes || undefined
    };

    const campaign: Campaign = {
      id: associatedCampaign.id,
      name: associatedCampaign.name,
      niche: associatedCampaign.niche,
      targetService: associatedCampaign.target_service,
      toneOfVoice: associatedCampaign.tone_of_voice,
      status: associatedCampaign.status as "active" | "paused",
      flowId: associatedCampaign.flow_id,
      knowledgeBaseId: associatedCampaign.knowledge_base_id,
      leadsCount: associatedCampaign.leads_count,
      cityFilter: associatedCampaign.city_filter || "",
      active: associatedCampaign.active,
      stats: associatedCampaign.stats
    };

    // 2. Fetch the SDR flow to extract step 1 template
    const { data: flowData, error: flowError } = await supabase
      .from("sdr_flows")
      .select("*")
      .eq("id", campaign.flowId)
      .single();

    if (flowError || !flowData) {
      throw new Error(`Flow not found for campaign: ${campaign.name}`);
    }

    const steps = flowData.steps || [];
    const stepOne = steps[0];
    const template = stepOne?.messageTemplate || "Olá {nome}, tudo bem? Vi sua empresa {empresa} no Google em {cidade}. Vocês já pensaram em criar um site profissional para atrair mais clientes?";

    // 3. Run AI Lead Enrichment
    const enrichment = await runLeadAnalyzer(lead, apiKey);

    // Update lead model with enrichment
    lead.enrichment = enrichment;
    lead.enrichStatus = "success";

    // 4. Generate Personalized Outreach Message
    const generatedMessageText = await runMessageGenerator(lead, campaign, template, apiKey);

    // 5. Send message via Evolution API
    // ⚠️ CRITICAL: We must select both 'nome' AND 'token' from the DB.
    // The /message/* Evolution API endpoints require the INSTANCE token (not the global key).
    // The token is stored in whatsapp_instances.token and was saved during instance creation.
    const { data: dbInstances } = await supabase
      .from("whatsapp_instances")
      .select("nome, token")
      .eq("status", "connected")
      .limit(1);

    if (!dbInstances || dbInstances.length === 0) {
      throw new Error("No connected WhatsApp instance available. Please connect a WhatsApp instance before running campaigns.");
    }

    const instanceName = dbInstances[0].nome;
    const instanceToken = dbInstances[0].token; // Per-instance token (required for /message/*)
    await sendWhatsAppMessage(instanceName, lead.phone, generatedMessageText, instanceToken);

    const nowIso = new Date().toISOString();
    const timeNow = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // 6. Update Lead status and enrichment in Supabase
    const { error: updateLeadError } = await supabase
      .from("leads")
      .update({
        status: "Abordado",
        enrichment: enrichment,
        last_message_at: nowIso
      })
      .eq("id", lead.id);

    if (updateLeadError) throw updateLeadError;

    // 7. Store chat conversation & message history in Supabase
    // Check if conversation exists
    let { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("lead_id", lead.id)
      .maybeSingle();

    let conversationId = conversation?.id;

    if (!conversationId) {
      // Create conversation
      const { data: newConv, error: createConvError } = await supabase
        .from("conversations")
        .insert({
          lead_id: lead.id,
          lead_name: lead.name,
          lead_phone: lead.phone,
          takeover_mode: "bot",
          last_message_at: timeNow,
          unread_count: 0
        })
        .select()
        .single();

      if (createConvError) throw createConvError;
      conversationId = newConv.id;
    } else {
      // Update last message time
      await supabase
        .from("conversations")
        .update({ last_message_at: timeNow })
        .eq("id", conversationId);
    }

    // Insert message history
    const { error: msgInsertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender: "bot",
        text: generatedMessageText,
        timestamp: timeNow,
        status: "sent"
      });

    if (msgInsertError) throw msgInsertError;

    // 8. Update campaign statistics
    const updatedStats = {
      ...campaign.stats,
      contactedCount: (campaign.stats.contactedCount || 0) + 1
    };

    await supabase
      .from("campaigns")
      .update({ stats: updatedStats })
      .eq("id", campaign.id);

    return NextResponse.json({
      success: true,
      leadName: lead.name,
      company: lead.company,
      enrichment: enrichment,
      messageSent: generatedMessageText
    });
  } catch (error: any) {
    console.error("Cron SDR prospecção handler failed", error);
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}
