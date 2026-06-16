import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { runQualificationAgent, runReplyGenerator } from "@/agents/agents";
import { sendWhatsAppMessage } from "@/lib/evolution";
import { Lead } from "@/store/useStore";

/**
 * Normalizes phone string to clean digit suffix for loose matching
 */
function cleanPhoneSuffix(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Return the last 8 or 9 digits to deal with country codes, DDD, and digit 9 variances
  return digits.length > 8 ? digits.slice(-8) : digits;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log("Evolution API Webhook received:", JSON.stringify(payload));

    const eventType = payload.event;

    // 1. Handle connection update event
    if (eventType === "connection.update" || eventType === "CONNECTION_UPDATE") {
      const instanceName = payload.instance;
      const state = payload.data?.state || payload.state;
      const mappedStatus = state === "open" || state === "CONNECTED" ? "connected" : "disconnected";

      if (instanceName) {
        const { error } = await supabase
          .from("whatsapp_instances")
          .update({ status: mappedStatus })
          .eq("nome", instanceName);

        if (error) {
          console.error(`Failed to update instance status via webhook for ${instanceName}:`, error);
          throw error;
        }

        console.log(`Webhook updated instance ${instanceName} status to: ${mappedStatus}`);
        return NextResponse.json({ received: true, type: "connection_update", updated: true });
      }
      return NextResponse.json({ error: "Instance name not found in payload" }, { status: 400 });
    }

    // 2. Handle message upsert event
    if (eventType !== "messages.upsert" && eventType !== "MESSAGES_UPSERT") {
      return NextResponse.json({ received: true, ignored: true, reason: `Ignored event: ${eventType}` });
    }

    const messageData = payload.data;
    if (!messageData || messageData.key?.fromMe === true) {
      // Ignore outgoing messages sent by the bot/instance itself
      return NextResponse.json({ received: true, ignored: true, reason: "Outgoing message" });
    }

    // Extract sender phone
    const remoteJid = messageData.key?.remoteJid || "";
    const cleanFrom = remoteJid.split("@")[0].replace(/\D/g, "");
    if (!cleanFrom) {
      return NextResponse.json({ error: "Sender remoteJid not found" }, { status: 400 });
    }

    // Extract text body
    const textBody = 
      messageData.message?.conversation || 
      messageData.message?.extendedTextMessage?.text || 
      messageData.text || 
      "";

    if (!textBody.trim()) {
      return NextResponse.json({ received: true, ignored: true, reason: "Empty message text" });
    }

    // 1. Search for lead with matching phone number suffix
    const suffix = cleanPhoneSuffix(cleanFrom);
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*");

    if (leadsError) throw leadsError;

    // Filter leads on the server for suffix match to handle country code prefix issues flexibly
    const matchingLead = leads.find(l => cleanPhoneSuffix(l.phone) === suffix);

    if (!matchingLead) {
      console.log(`No lead found matching phone number suffix: ${suffix} (${cleanFrom})`);
      return NextResponse.json({ received: true, leadFound: false });
    }

    // Map database lead to frontend Lead model
    const lead: Lead = {
      id: matchingLead.id,
      name: matchingLead.name,
      company: matchingLead.company,
      phone: matchingLead.phone,
      city: matchingLead.city,
      state: matchingLead.state,
      category: matchingLead.category,
      section: matchingLead.section,
      rating: Number(matchingLead.rating) || 0,
      numRatings: matchingLead.num_ratings || 0,
      socialLink: matchingLead.social_link || undefined,
      status: matchingLead.status,
      enrichStatus: matchingLead.enrichment ? "success" : "idle",
      enrichment: matchingLead.enrichment || undefined,
      takeoverMode: (matchingLead.takeover_mode as "bot" | "human") || "bot",
      notes: matchingLead.notes || undefined
    };

    const timeNow = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // 2. Fetch or create conversation
    let { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("lead_id", lead.id)
      .maybeSingle();

    let conversationId = conversation?.id;

    if (!conversationId) {
      const { data: newConv, error: createConvError } = await supabase
        .from("conversations")
        .insert({
          lead_id: lead.id,
          lead_name: lead.name,
          lead_phone: lead.phone,
          takeover_mode: lead.takeoverMode,
          last_message_at: timeNow,
          unread_count: 1
        })
        .select()
        .single();

      if (createConvError) throw createConvError;
      conversationId = newConv.id;
    } else {
      // Update last message time and increment unread count
      await supabase
        .from("conversations")
        .update({
          last_message_at: timeNow,
          unread_count: (conversation.unread_count || 0) + 1
        })
        .eq("id", conversationId);
    }

    // 3. Insert incoming message into message history
    const { error: msgInsertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender: "user",
        text: textBody,
        timestamp: timeNow,
        status: "read"
      });

    if (msgInsertError) throw msgInsertError;

    // 4. Trigger Qualification Agent to check intent
    const apiKey = process.env.OPENROUTER_API_KEY;
    const qualResult = await runQualificationAgent(lead, textBody, apiKey);

    // 5. Apply status adjustments based on Qualification Agent
    let newStatus = lead.status;
    let newTakeoverMode = lead.takeoverMode;

    if (lead.status === "Novo Lead" || lead.status === "Abordado") {
      newStatus = "Respondeu";
    }

    if (qualResult.takeoverRequired) {
      newStatus = "Qualificado";
      newTakeoverMode = "human";
    } else if (qualResult.status === "Perdido") {
      newStatus = "Perdido";
    }

    // Update Lead table row in Supabase
    const { error: updateLeadError } = await supabase
      .from("leads")
      .update({
        status: newStatus,
        takeover_mode: newTakeoverMode,
        notes: qualResult.summary
      })
      .eq("id", lead.id);

    if (updateLeadError) throw updateLeadError;

    // Update Conversation row to match new takeover mode
    await supabase
      .from("conversations")
      .update({ takeover_mode: newTakeoverMode })
      .eq("id", conversationId);

    // If takeover mode continues as bot, reply automatically
    let autoRepliedMessage = null;
    if (newTakeoverMode === "bot" && newStatus === "Respondeu") {
      try {
        console.log(`[Webhook] Gerando resposta bot automática para lead: ${lead.name}`);
        const replyText = await runReplyGenerator(lead, textBody, apiKey);
        
        // Fetch active connected instance
        const { data: dbInstances } = await supabase
          .from("whatsapp_instances")
          .select("nome, token")
          .eq("status", "connected")
          .limit(1);

        if (dbInstances && dbInstances.length > 0) {
          const instanceName = dbInstances[0].nome;
          const instanceToken = dbInstances[0].token;
          
          await sendWhatsAppMessage(instanceName, lead.phone, replyText, instanceToken);
          console.log(`[Webhook] Resposta bot enviada via WhatsApp para +${lead.phone}`);
          autoRepliedMessage = replyText;

          // Insert generated bot message in DB for Livechat sync
          await supabase
            .from("messages")
            .insert({
              conversation_id: conversationId,
              sender: "bot",
              text: replyText,
              timestamp: timeNow,
              status: "sent"
            });
        } else {
          console.warn("[Webhook] Nenhuma instância WhatsApp conectada para enviar resposta bot.");
        }
      } catch (errReply) {
        console.error("[Webhook] Erro ao responder automaticamente:", errReply);
      }
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      leadName: lead.name,
      analyzedText: textBody,
      interestScore: qualResult.interestScore,
      newStatus,
      takeoverRequired: qualResult.takeoverRequired
    });
  } catch (error: any) {
    console.error("Webhook Evolution API message handler failed", error);
    return NextResponse.json({ error: error.message || error }, { status: 500 });
  }
}
