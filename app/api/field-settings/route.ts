import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rowToFieldSettings, settingsToUpdatePayload } from "@/lib/fieldSettings";
import type { FieldSettings } from "@/lib/fieldConfig";

async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { user: null, error: "Липсва login token." };
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user?.email) {
    return { user: null, error: error?.message || "Невалидна login сесия." };
  }

  return { user: data.user, error: null };
}

export async function GET(request: Request) {
  try {
    const { user, error } = await getUserFromRequest(request);
    if (error || !user?.email) {
      return NextResponse.json({ ok: false, message: error }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error: selectError } = await supabaseAdmin
      .from("field_requests")
      .select("*")
      .eq("email", user.email.toLowerCase())
      .in("status", ["active", "payment_pending", "suspended"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      return NextResponse.json({ ok: false, message: selectError.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, message: "Не намерих активен профил за този акаунт." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, settings: rowToFieldSettings(data) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Неочаквана грешка." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { user, error } = await getUserFromRequest(request);
    if (error || !user?.email) {
      return NextResponse.json({ ok: false, message: error }, { status: 401 });
    }

    const body = await request.json();
    const settings = body.settings as FieldSettings;

    if (!settings?.name?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Името на игрището е задължително." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("field_requests")
      .select("id")
      .eq("email", user.email.toLowerCase())
      .in("status", ["active", "payment_pending", "suspended"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ ok: false, message: existingError.message }, { status: 500 });
    }

    if (!existing?.id) {
      return NextResponse.json(
        { ok: false, message: "Не намерих активен профил за този акаунт." },
        { status: 404 },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("field_requests")
      .update(settingsToUpdatePayload(settings))
      .eq("id", existing.id);

    if (updateError) {
      return NextResponse.json({ ok: false, message: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "Настройките са запазени успешно." });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Неочаквана грешка." },
      { status: 500 },
    );
  }
}
