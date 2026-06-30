import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createFieldSlug, rowToFieldSettings } from "@/lib/fieldSettings";
import type { FieldSettingsRow } from "@/lib/fieldSettings";
import { resolveRealFieldId } from "@/lib/fieldIdentity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicFieldRow = FieldSettingsRow & {
  id: string;
  field_id?: string | null;
  field_name?: string | null;
  city?: string | null;
  message?: string | null;
  status?: string | null;
};

type SupabaseLike = any;

function getPublicSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL или NEXT_PUBLIC_SUPABASE_ANON_KEY липсва.");
  }

  try {
    return { client: getSupabaseAdmin(), canResolveFieldId: true };
  } catch {
    return {
      client: createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      }),
      canResolveFieldId: false,
    };
  }
}

async function toPublicField(
  supabaseClient: SupabaseLike,
  row: PublicFieldRow,
  canResolveFieldId: boolean,
) {
  const settings = rowToFieldSettings(row);
  const realFieldId = canResolveFieldId ? await resolveRealFieldId(supabaseClient, row) : row.field_id || row.id;

  return {
    id: realFieldId || row.field_id || row.id,
    status: row.status || "active",
    name: settings.name,
    slug: settings.slug || createFieldSlug(settings.name),
    region: settings.region,
    settlement: settings.settlement,
    location: settings.location,
    description: settings.description,
    logoUrl: settings.logoUrl,
    logoFit: settings.logoFit,
    logoScale: settings.logoScale,
    logoX: settings.logoX,
    logoY: settings.logoY,
    backgroundUrl: settings.backgroundUrl,
    ownPrice: settings.ownPrice,
    rentalPrice: settings.rentalPrice,
    phone: settings.phone,
    facebook: settings.facebook,
    instagram: settings.instagram,
    tiktok: settings.tiktok,
  };
}

async function loadFieldRequestRows(client: SupabaseLike) {
  return client
    .from("field_requests")
    .select(
      "id,field_id,field_name,city,message,facebook,instagram,tiktok,status,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,own_price,rental_price,contact_phone,phone",
    )
    .eq("status", "active")
    .order("field_name", { ascending: true });
}

async function loadFieldsRows(client: SupabaseLike) {
  return client
    .from("fields")
    .select("id,field_name,city,phone")
    .order("field_name", { ascending: true });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = (searchParams.get("slug") || "").trim();

    const { client, canResolveFieldId } = getPublicSupabase();
    let rows: PublicFieldRow[] = [];

    const requestResult = await loadFieldRequestRows(client);

    if (!requestResult.error && Array.isArray(requestResult.data)) {
      rows = requestResult.data as PublicFieldRow[];
    }

    if (rows.length === 0) {
      const fieldsResult = await loadFieldsRows(client);
      if (!fieldsResult.error && Array.isArray(fieldsResult.data)) {
        rows = (fieldsResult.data as PublicFieldRow[]).map((field) => ({
          ...field,
          field_id: field.id,
          status: "active",
        }));
      }
    }

    const fields = await Promise.all(
      rows.map((row) => toPublicField(client, row, canResolveFieldId)),
    );

    if (slug) {
      const field = fields.find(
        (item) => item.slug === slug || createFieldSlug(item.name) === slug,
      );

      if (!field) {
        return NextResponse.json(
          { ok: false, message: "Не намерих активно игрище с този адрес." },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { ok: true, field },
        { headers: { "Cache-Control": "no-store, max-age=0" } },
      );
    }

    return NextResponse.json(
      { ok: true, fields },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Неочаквана грешка." },
      { status: 500 },
    );
  }
}
