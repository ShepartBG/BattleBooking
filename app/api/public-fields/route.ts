import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createFieldSlug, rowToFieldSettings } from "@/lib/fieldSettings";
import type { FieldSettingsRow } from "@/lib/fieldSettings";
import { resolveRealFieldId } from "@/lib/fieldIdentity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PublicFieldRow = FieldSettingsRow & {
  id: string;
  field_id: string | null;
  field_name: string | null;
  city: string | null;
  message: string | null;
  status: string;
};

async function toPublicField(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>, row: PublicFieldRow) {
  const settings = rowToFieldSettings(row);
  const realFieldId = await resolveRealFieldId(supabaseAdmin, row);

  return {
    id: realFieldId || row.id,
    status: row.status,
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = (searchParams.get("slug") || "").trim();

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("field_requests")
      .select(
        "id,field_id,field_name,city,message,facebook,instagram,tiktok,status,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,own_price,rental_price,contact_phone,phone",
      )
      .eq("status", "active")
      .order("field_name", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    const fields = await Promise.all(
      ((data || []) as PublicFieldRow[]).map((row) => toPublicField(supabaseAdmin, row)),
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
