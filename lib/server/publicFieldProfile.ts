import { DEFAULT_FIELD_SETTINGS, type FieldSettings } from "@/lib/fieldConfig";
import { rowToFieldSettings, type FieldSettingsRow } from "@/lib/fieldSettings";

type PublicFieldRow = FieldSettingsRow & {
  id?: string | null;
  field_id?: string | null;
  status?: string | null;
  public_own_price?: string | null;
  public_rental_price?: string | null;
};

function normalizeFieldsRow(row: PublicFieldRow | null | undefined): FieldSettingsRow | null {
  if (!row) return null;

  return {
    ...row,
    own_price: row.own_price ?? row.public_own_price ?? null,
    rental_price: row.rental_price ?? row.public_rental_price ?? null,
  };
}

export async function loadPublicFieldProfileById(
  client: any,
  fieldId?: string | null,
): Promise<FieldSettings> {
  const cleanFieldId = String(fieldId || "").trim();
  if (!cleanFieldId) return DEFAULT_FIELD_SETTINGS;

  // The originally approved field keeps its public profile in field_requests.
  const requestResult = await client
    .from("field_requests")
    .select(
      "id,field_id,field_name,city,message,facebook,instagram,tiktok,status,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,own_price,rental_price,contact_phone,phone",
    )
    .eq("status", "active")
    .eq("field_id", cleanFieldId)
    .limit(1)
    .maybeSingle();

  if (!requestResult.error && requestResult.data) {
    return rowToFieldSettings(requestResult.data as PublicFieldRow);
  }

  // Every additional field keeps its complete profile in fields.
  const fieldResult = await client
    .from("fields")
    .select(
      "id,field_name,city,phone,contact_phone,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,public_own_price,public_rental_price,facebook,instagram,tiktok",
    )
    .eq("id", cleanFieldId)
    .limit(1)
    .maybeSingle();

  if (!fieldResult.error && fieldResult.data) {
    return rowToFieldSettings(normalizeFieldsRow(fieldResult.data as PublicFieldRow));
  }

  // Compatibility for very old data where field_requests.id was saved in games.field_id.
  const legacyRequestResult = await client
    .from("field_requests")
    .select(
      "id,field_id,field_name,city,message,facebook,instagram,tiktok,status,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,own_price,rental_price,contact_phone,phone",
    )
    .eq("status", "active")
    .eq("id", cleanFieldId)
    .limit(1)
    .maybeSingle();

  if (!legacyRequestResult.error && legacyRequestResult.data) {
    return rowToFieldSettings(legacyRequestResult.data as PublicFieldRow);
  }

  return DEFAULT_FIELD_SETTINGS;
}

export async function loadPublicFieldProfilesByIds(
  client: any,
  fieldIds: Array<string | null | undefined>,
): Promise<Record<string, FieldSettings>> {
  const ids = Array.from(
    new Set(fieldIds.map((value) => String(value || "").trim()).filter(Boolean)),
  );

  if (!ids.length) return {};

  // Load all profiles in three bulk queries instead of running 2-3 queries per game.
  // Priority stays identical to loadPublicFieldProfileById:
  // active field_request -> fields row -> legacy field_request id.
  const [requestResult, fieldResult, legacyRequestResult] = await Promise.all([
    client
      .from("field_requests")
      .select(
        "id,field_id,field_name,city,message,facebook,instagram,tiktok,status,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,own_price,rental_price,contact_phone,phone",
      )
      .eq("status", "active")
      .in("field_id", ids),
    client
      .from("fields")
      .select(
        "id,field_name,city,phone,contact_phone,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,public_own_price,public_rental_price,facebook,instagram,tiktok",
      )
      .in("id", ids),
    client
      .from("field_requests")
      .select(
        "id,field_id,field_name,city,message,facebook,instagram,tiktok,status,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,own_price,rental_price,contact_phone,phone",
      )
      .eq("status", "active")
      .in("id", ids),
  ]);

  const profiles: Record<string, FieldSettings> = {};

  for (const row of requestResult.data || []) {
    const key = String(row.field_id || "").trim();
    if (key && ids.includes(key)) profiles[key] = rowToFieldSettings(row as PublicFieldRow);
  }

  for (const row of fieldResult.data || []) {
    const key = String(row.id || "").trim();
    if (key && ids.includes(key) && !profiles[key]) {
      profiles[key] = rowToFieldSettings(normalizeFieldsRow(row as PublicFieldRow));
    }
  }

  for (const row of legacyRequestResult.data || []) {
    const key = String(row.id || "").trim();
    if (key && ids.includes(key) && !profiles[key]) {
      profiles[key] = rowToFieldSettings(row as PublicFieldRow);
    }
  }

  for (const id of ids) {
    if (!profiles[id]) profiles[id] = DEFAULT_FIELD_SETTINGS;
  }

  return profiles;
}
