import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { 
  createEvoInstance, 
  deleteEvoInstance, 
  logoutEvoInstance, 
  setEvoWebhook, 
  getConnectState, 
  generateQrCode 
} from "@/lib/evolution";

/**
 * GET /api/instances
 * Fetches instances from Supabase and syncs their status with the Evolution API
 */
export async function GET() {
  try {
    const { data: dbInstances, error } = await supabase
      .from("whatsapp_instances")
      .select("*");

    if (error) throw error;

    const syncedInstances = await Promise.all(
      (dbInstances || []).map(async (inst) => {
        // Sync live state from Evolution API
        const liveState = await getConnectState(inst.nome);

        // ✅ Correctly map all 3 states (was silently converting CONNECTING → disconnected)
        const mappedStatus =
          liveState === "CONNECTED" ? "connected" :
          liveState === "CONNECTING" ? "connecting" :
          "disconnected";

        // Update database if state changed
        if (inst.status !== mappedStatus) {
          await supabase
            .from("whatsapp_instances")
            .update({ status: mappedStatus })
            .eq("id", inst.id);
          inst.status = mappedStatus;
        }

        // ✅ DO NOT fetch QR code here — this endpoint is polled every 8s by the store.
        // QR fetching only happens via GET /api/instances/qrcode when the modal is opened.
        // Fetching QR here causes N parallel Evolution API calls every poll cycle.

        return {
          id: inst.id,
          nome: inst.nome,
          numero: inst.numero || "",
          status: mappedStatus,
          qr_code: inst.qr_code || undefined,
          token: inst.token,
          created_at: inst.created_at
        };
      })
    );

    return NextResponse.json(syncedInstances);
  } catch (err: any) {
    console.error("Failed to GET and sync WhatsApp instances:", err);
    return NextResponse.json({ error: err.message || err }, { status: 500 });
  }
}

/**
 * POST /api/instances
 * Creates a new instance in the Evolution API, saves it in Supabase, and sets up the Webhook
 */
export async function POST(request: Request) {
  try {
    const { name, phone } = await request.json();

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and Phone are required parameters" }, { status: 400 });
    }

    // 1. Create instance in Evolution API
    const evoResult = await createEvoInstance(name, phone);
    const instanceToken = evoResult?.hash;
    const qrCodeBase64 = evoResult?.qrcode?.base64 || evoResult?.qrcode || null;

    if (!instanceToken) {
      throw new Error("Evolution API did not return an instance hash/token");
    }

    // 2. Insert the instance in Supabase database
    const { data: dbInstance, error: insertError } = await supabase
      .from("whatsapp_instances")
      .insert({
        nome: name,
        numero: phone,
        status: "connecting",
        qr_code: qrCodeBase64,
        token: instanceToken
      })
      .select()
      .single();

    if (insertError) {
      // Cleanup created Evolution API instance on Supabase insert failure
      await deleteEvoInstance(name);
      throw insertError;
    }

    // 3. Set Webhook dynamically based on request host
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const webhookUrl = `${protocol}://${host}/api/webhooks/whatsapp`;

    console.log(`Configuring webhook for instance ${name} to URL: ${webhookUrl}`);
    try {
      await setEvoWebhook(name, webhookUrl);
    } catch (webhookErr) {
      console.error(`Failed to automatically register webhook for ${name}`, webhookErr);
      // We do not fail the request, but log the warning
    }

    return NextResponse.json({
      success: true,
      instance: {
        id: dbInstance.id,
        nome: dbInstance.nome,
        numero: dbInstance.numero,
        status: "connecting",
        qr_code: qrCodeBase64 || undefined,
        token: instanceToken
      }
    });
  } catch (err: any) {
    console.error("Failed to create WhatsApp instance:", err);
    return NextResponse.json({ error: err.message || err }, { status: 500 });
  }
}

/**
 * DELETE /api/instances
 * Deletes an instance from the Evolution API and removes it from Supabase
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const name = searchParams.get("name");

    if (!id || !name) {
      return NextResponse.json({ error: "Missing required query parameters: id and name" }, { status: 400 });
    }

    // 1. Delete from Evolution API
    try {
      await deleteEvoInstance(name);
    } catch (evoErr) {
      console.warn(`Could not delete instance ${name} from Evolution API (might not exist):`, evoErr);
    }

    // 2. Delete from Supabase
    const { error: deleteError } = await supabase
      .from("whatsapp_instances")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Failed to delete WhatsApp instance:", err);
    return NextResponse.json({ error: err.message || err }, { status: 500 });
  }
}
