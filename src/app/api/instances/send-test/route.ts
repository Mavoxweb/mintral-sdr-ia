import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage, formatPhoneNumber } from "@/lib/evolution";

/**
 * POST /api/instances/send-test
 * Sends a test WhatsApp message from a specific instance to a given phone number.
 * Uses the instance token (not global key) as required by Evolution API /message/* endpoints.
 */
export async function POST(request: Request) {
  try {
    const { instanceId, instanceName, toPhone } = await request.json();

    if (!instanceName || !toPhone) {
      return NextResponse.json(
        { error: "instanceName e toPhone são obrigatórios." },
        { status: 400 }
      );
    }

    // Fetch the instance token from the database
    const query = supabase
      .from("whatsapp_instances")
      .select("nome, token, status");

    const { data: instances, error: fetchError } = instanceId
      ? await query.eq("id", instanceId).limit(1)
      : await query.eq("nome", instanceName).limit(1);

    if (fetchError) throw fetchError;

    if (!instances || instances.length === 0) {
      return NextResponse.json(
        { error: `Instância "${instanceName}" não encontrada no banco de dados.` },
        { status: 404 }
      );
    }

    const instance = instances[0];

    if (instance.status !== "connected") {
      return NextResponse.json(
        { error: `Instância "${instanceName}" não está conectada. Status atual: ${instance.status}` },
        { status: 422 }
      );
    }

    if (!instance.token) {
      return NextResponse.json(
        { error: `Token da instância "${instanceName}" não encontrado. Recrie a instância.` },
        { status: 422 }
      );
    }

    const cleanPhone = formatPhoneNumber(toPhone);
    const testMessage =
      `✅ *Antigravity SDR AI — Teste de Envio*\n\n` +
      `Olá! Esta é uma mensagem de teste enviada pela instância *${instanceName}*.\n\n` +
      `Se você recebeu esta mensagem, a integração com a Evolution API está funcionando corretamente! 🚀\n\n` +
      `_Sistema: Antigravity SDR AI v1.0_`;

    const result = await sendWhatsAppMessage(
      instance.nome,
      cleanPhone,
      testMessage,
      instance.token // ✅ Instance token — required for /message/* endpoints
    );

    return NextResponse.json({
      success: true,
      phone: cleanPhone,
      instance: instance.nome,
      evolutionResponse: result,
    });
  } catch (err: any) {
    console.error("[send-test] Failed to send test message:", err);
    return NextResponse.json(
      { error: err.message || "Erro desconhecido ao enviar mensagem de teste." },
      { status: 500 }
    );
  }
}
