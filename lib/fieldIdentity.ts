export type FieldRequestLike = {
  id?: string | null;
  field_name?: string | null;
  city?: string | null;
  phone?: string | null;
  contact_phone?: string | null;
};

type SupabaseLike = {
  from: (table: string) => any;
};

function clean(value?: string | null) {
  return String(value || "").trim();
}

export async function resolveRealFieldId(
  supabaseClient: SupabaseLike,
  fieldRequest: FieldRequestLike | null | undefined,
): Promise<string | null> {
  if (!fieldRequest) return null;

  const fieldName = clean(fieldRequest.field_name);
  const city = clean(fieldRequest.city);
  const phone = clean(fieldRequest.contact_phone || fieldRequest.phone);

  // 1) Най-сигурната връзка в текущата база: fields.field_name + city + phone.
  if (fieldName) {
    let query = supabaseClient
      .from("fields")
      .select("id,field_name,city,phone")
      .eq("field_name", fieldName);

    if (city) query = query.eq("city", city);
    if (phone) query = query.eq("phone", phone);

    const { data, error } = await query.limit(1).maybeSingle();
    if (!error && data?.id) return data.id;
  }

  // 2) Fallback само по име на терена.
  if (fieldName) {
    const { data, error } = await supabaseClient
      .from("fields")
      .select("id,field_name,city,phone")
      .eq("field_name", fieldName)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id;
  }

  // 3) Fallback само по телефон.
  if (phone) {
    const { data, error } = await supabaseClient
      .from("fields")
      .select("id,field_name,city,phone")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id;
  }

  return null;
}
