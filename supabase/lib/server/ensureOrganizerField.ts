import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type FieldRequestRow = {
  id: string;
  field_id?: string | null;
  field_name?: string | null;
  city?: string | null;
  phone?: string | null;
  contact_phone?: string | null;
};

function clean(value?: string | null) {
  return String(value || "").trim();
}

export async function ensureOrganizerField(
  fieldRequest: FieldRequestRow,
): Promise<string> {
  const admin = getSupabaseAdmin();

  if (fieldRequest.field_id) {
    const { data: existingField } = await admin
      .from("fields")
      .select("id")
      .eq("id", fieldRequest.field_id)
      .maybeSingle();

    if (existingField?.id) return existingField.id;
  }

  const fieldName = clean(fieldRequest.field_name);
  const city = clean(fieldRequest.city);
  const phone = clean(fieldRequest.contact_phone || fieldRequest.phone);

  if (!fieldName) {
    throw new Error("Заявката няма име на игрище и не може да бъде свързана с field_id.");
  }

  let fieldId: string | null = null;

  if (fieldName && city && phone) {
    const { data } = await admin
      .from("fields")
      .select("id")
      .eq("field_name", fieldName)
      .eq("city", city)
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();
    fieldId = data?.id || null;
  }

  if (!fieldId && fieldName && city) {
    const { data } = await admin
      .from("fields")
      .select("id")
      .eq("field_name", fieldName)
      .eq("city", city)
      .limit(1)
      .maybeSingle();
    fieldId = data?.id || null;
  }

  if (!fieldId) {
    const { data, error } = await admin
      .from("fields")
      .insert({
        field_name: fieldName,
        city: city || null,
        phone: phone || null,
        rental_kits: 0,
        rental_price: 0,
        own_gear_price: 0,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      throw new Error(error?.message || "Не успях да създам профил на игрището.");
    }

    fieldId = data.id;
  }

  const { error: linkError } = await admin
    .from("field_requests")
    .update({ field_id: fieldId })
    .eq("id", fieldRequest.id);

  if (linkError) {
    throw new Error("Игрището е намерено, но не успях да запиша field_id: " + linkError.message);
  }

  return fieldId;
}
