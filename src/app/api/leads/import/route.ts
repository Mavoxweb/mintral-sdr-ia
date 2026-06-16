import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/leads/import
 * Reads leads_sem_site.json and bulk-inserts up to `limit` leads into Supabase.
 * Skips leads that already exist (matched by phone number).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit: number = body.limit ?? 100;

    const filePath = path.join(process.cwd(), "leads_sem_site.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "leads_sem_site.json not found" }, { status: 404 });
    }

    const raw: any[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const slice = raw.slice(0, limit);

    // Map JSON fields → DB columns
    const rows = slice
      .filter((r) => r.telefone) // skip entries without phone
      .map((r) => ({
        company: r.nome || "Sem Nome",
        name: (r.nome || "").split(" ").slice(0, 2).join(" ") || "Contato",
        phone: r.telefone,
        category: r.categoria || "Geral",
        city: r.cidade || "",
        state: r.estado || "",
        section: r.secao || "Geral",
        rating: r.avaliacao ?? null,
        num_ratings: r.num_avaliacoes ?? 0,
        social_link: r.link_rede_social || null,
        status: "Novo Lead",
        takeover_mode: "bot",
      }));

    if (rows.length === 0) {
      return NextResponse.json({ message: "Nenhum lead válido para importar", imported: 0 });
    }

    // Upsert: ignore duplicates by phone (needs unique constraint on phone)
    const { data, error } = await supabase
      .from("leads")
      .upsert(rows, { onConflict: "phone", ignoreDuplicates: true })
      .select("id");

    if (error) throw error;

    return NextResponse.json({
      success: true,
      imported: data?.length ?? rows.length,
      total: raw.length,
      message: `${data?.length ?? rows.length} leads importados com sucesso de ${raw.length} disponíveis.`,
    });
  } catch (err: any) {
    console.error("[leads/import]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
