import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { DEFAULT_FIELD_SETTINGS } from "@/lib/fieldConfig";
import { rowToFieldSettings } from "@/lib/fieldSettings";
import type { FieldSettingsRow } from "@/lib/fieldSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicFieldRow = FieldSettingsRow & {
  id?: string | null;
  field_id?: string | null;
  field_name?: string | null;
  city?: string | null;
  message?: string | null;
  status?: string | null;
};

function getPublicSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY липсва.");
  }

  try {
    return getSupabaseAdmin();
  } catch {
    return createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
}

async function loadFieldSettings(client: any, fieldId?: string | null) {
  const cleanFieldId = fieldId?.trim();
  if (!cleanFieldId) return DEFAULT_FIELD_SETTINGS;

  const requestResult = await client
    .from("field_requests")
    .select(
      "id,field_id,field_name,city,message,facebook,instagram,tiktok,status,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,own_price,rental_price,contact_phone,phone",
    )
    .eq("status", "active")
    .or(`field_id.eq.${cleanFieldId},id.eq.${cleanFieldId}`)
    .limit(1)
    .maybeSingle();

  if (!requestResult.error && requestResult.data) {
    return rowToFieldSettings(requestResult.data as PublicFieldRow);
  }

  const fieldResult = await client
    .from("fields")
    .select("id,field_name,city,phone")
    .eq("id", cleanFieldId)
    .limit(1)
    .maybeSingle();

  if (!fieldResult.error && fieldResult.data) {
    return rowToFieldSettings(fieldResult.data as PublicFieldRow);
  }

  return DEFAULT_FIELD_SETTINGS;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const gameId = id?.trim();

    if (!gameId) {
      return NextResponse.json({ ok: false, error: "Липсва ID на играта." }, { status: 400 });
    }

    const client = getPublicSupabase();

    const gameResult = await client
      .from("games")
      .select("*")
      .eq("id", gameId)
      .maybeSingle();

    if (gameResult.error) {
      return NextResponse.json(
        { ok: false, error: `Грешка при зареждане на играта: ${gameResult.error.message}` },
        { status: 500 },
      );
    }

    const game = gameResult.data;

    if (!game) {
      return NextResponse.json(
        { ok: true, game: null, fieldSettings: DEFAULT_FIELD_SETTINGS, stats: { totalPlayers: 0, rentalPlayers: 0 } },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    const [fieldSettings, registrationsResult] = await Promise.all([
      loadFieldSettings(client, game.field_id),
      client
        .from("registrations")
        .select("participation_type")
        .eq("game_id", game.id)
        .eq("status", "active"),
    ]);

    const registrations = Array.isArray(registrationsResult.data) ? registrationsResult.data : [];
    const totalPlayers = registrations.length;
    const rentalPlayers = registrations.filter(
      (item: { participation_type?: string | null }) => item.participation_type === "rental",
    ).length;

    return NextResponse.json(
      {
        ok: true,
        game,
        fieldSettings,
        stats: { totalPlayers, rentalPlayers },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Неочаквана грешка." },
      { status: 500 },
    );
  }
}
