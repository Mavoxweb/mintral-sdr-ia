import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/evolution";

/**
 * GET /api/conversations
 * Returns all conversations with their messages and associated instance info.
 */
export async function GET() {
  try {
    const { data: convs, error: convErr } = await supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false });
    if (convErr) throw convErr;

    const results = await Promise.all(
      (convs || []).map(async (conv) => {
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });
        return { ...conv, messages: msgs || [] };
      })
    );

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/conversations
 * Sends a message from the human operator via a selected WhatsApp instance.
 * Body: { conversationId, leadPhone, instanceId, text }
 */
export async function POST(request: Request) {
  try {
    const { conversationId, leadPhone, instanceId, text } = await request.json();

    if (!conversationId || !leadPhone || !text) {
      return NextResponse.json({ error: "conversationId, leadPhone e text são obrigatórios" }, { status: 400 });
    }

    const timeNow = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // 1. Save message to DB immediately (optimistic)
    const { data: msg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender: "human",
        text,
        timestamp: timeNow,
        status: "sent",
      })
      .select()
      .single();
    if (msgErr) throw msgErr;

    // 2. Update conversation last_message_at
    await supabase
      .from("conversations")
      .update({ last_message_at: timeNow })
      .eq("id", conversationId);

    // 3. Send via WhatsApp if instance selected
    if (instanceId) {
      const { data: instRows } = await supabase
        .from("whatsapp_instances")
        .select("nome, token, status")
        .eq("id", instanceId)
        .limit(1);

      const inst = instRows?.[0];
      if (inst?.status === "connected" && inst?.token) {
        try {
          await sendWhatsAppMessage(inst.nome, leadPhone, text, inst.token);
          await supabase.from("messages").update({ status: "delivered" }).eq("id", msg.id);
        } catch (sendErr: any) {
          console.error("[conversations POST] WhatsApp send failed:", sendErr.message);
          // Don't fail the request — message is saved, just not delivered via WA
        }
      }
    }

    return NextResponse.json({ success: true, message: msg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
