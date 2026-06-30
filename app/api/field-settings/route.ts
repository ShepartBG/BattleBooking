import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { rowToFieldSettings, settingsToUpdatePayload } from "@/lib/fieldSettings";
import type { FieldSettings } from "@/lib/fieldConfig";

function getAuthedSupabase(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!supabaseUrl || !anonKey) {
    return { client: null, token: "", error: "Supabase public env липсва." };
  }

  if (!token) {
    return { client: null, token: "", error: "Липсва login token." };
  }

  return {
    token,
    error: null,
    client: createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }),
  };
}

function getDataClient(request: Request) {
  try {
    return getSupabaseAdmin();
  } catch {
    return getAuthedSupabase(request).client;
  }
}

async function getUserFromRequest(request: Request) {
  const auth = getAuthedSupabase(request);

  if (auth.error || !auth.client) {
    return { user: null, error: auth.error };
  }

  const { data, error } = await auth.client.auth.getUser(auth.token);

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

    const supabaseAdmin = getDataClient(request);
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, message: "Supabase client липсва." }, { status: 500 });
    }

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

    const supabaseAdmin = getDataClient(request);
    if (!supabaseAdmin) {
      return NextResponse.json({ ok: false, message: "Supabase client липсва." }, { status: 500 });
    }

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
