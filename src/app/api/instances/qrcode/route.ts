import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateQrCode, getConnectState } from "@/lib/evolution";

/**
 * GET /api/instances/qrcode?id=<uuid>
 * Fetches a fresh QR code and current connection state for a specific instance.
 * Used for polling in the QR Code modal.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const name = searchParams.get("name");

    if (!id && !name) {
      return NextResponse.json(
        { error: "Missing required param: id or name" },
        { status: 400 }
      );
    }

    // Fetch instance from DB
    const query = supabase
      .from("whatsapp_instances")
      .select("id, nome, status, qr_code, token");

    const { data: instances, error } = id
      ? await (query.eq("id", id).limit(1))
      : await (query.eq("nome", name).limit(1));

    if (error) throw error;
    if (!instances || instances.length === 0) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 });
    }

    const inst = instances[0];

    // Check live state from Evolution API
    const liveState = await getConnectState(inst.nome);
    const mappedStatus =
      liveState === "CONNECTED"
        ? "connected"
        : liveState === "CONNECTING"
        ? "connecting"
        : "disconnected";

    // Update DB if state changed
    if (inst.status !== mappedStatus) {
      await supabase
        .from("whatsapp_instances")
        .update({ status: mappedStatus })
        .eq("id", inst.id);
    }

    // If connected, no need for QR code
    if (mappedStatus === "connected") {
      return NextResponse.json({
        status: "connected",
        qrCode: null,
        instanceName: inst.nome,
      });
    }

    // Fetch a fresh QR code from Evolution API
    const freshQr = await generateQrCode(inst.nome);

    // Persist the new QR code in DB if it changed
    if (freshQr && freshQr !== inst.qr_code) {
      await supabase
        .from("whatsapp_instances")
        .update({ qr_code: freshQr })
        .eq("id", inst.id);
    }

    const qrCode = freshQr || inst.qr_code || null;

    return NextResponse.json({
      status: mappedStatus,
      qrCode,
      instanceName: inst.nome,
    });
  } catch (err: any) {
    console.error("[qrcode] Failed to get QR code:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
