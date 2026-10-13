import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public platform counter: every registration ever made on every field.
export async function GET() {
  try {
    const admin = getSupabaseAdmin();
    const { count, error } = await admin
      .from("registrations")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, totalRegistrations: count || 0 },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Грешка при зареждане на статистиката." },
      { status: 500 },
    );
  }
}
