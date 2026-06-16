import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "leads_sem_site.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "leads_sem_site.json not found" }, { status: 404 });
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const leads = JSON.parse(fileContent);

    // Return first 50 leads to avoid overloading the UI initially
    return NextResponse.json({
      total: leads.length,
      leads: leads.slice(0, 80) // Serve 80 leads initially for demonstration
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
