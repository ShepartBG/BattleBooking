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

function normalizePhone(value?: string | null) {
  return clean(value).replace(/\D/g, "");
}

async function findFieldByRequest(
  supabaseClient: SupabaseLike,
  fieldRequest: FieldRequestLike,
): Promise<string | null> {
  const fieldName = clean(fieldRequest.field_name);
  const city = clean(fieldRequest.city);
  const phoneRaw = clean(fieldRequest.contact_phone || fieldRequest.phone);
  const phoneDigits = normalizePhone(phoneRaw);

  // 1) Най-сигурната връзка в текущата база: fields.field_name + city + phone.
  if (fieldName) {
    let query = supabaseClient
      .from("fields")
      .select("id,field_name,city,phone")
      .eq("field_name", fieldName);

    if (city) query = query.eq("city", city);
    if (phoneRaw) query = query.eq("phone", phoneRaw);

    const { data, error } = await query.limit(1).maybeSingle();
    if (!error && data?.id) return data.id;
  }

  // 2) Fallback само по име + град.
  if (fieldName && city) {
    const { data, error } = await supabaseClient
      .from("fields")
      .select("id,field_name,city,phone")
      .eq("field_name", fieldName)
      .eq("city", city)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id;
  }

  // 3) Fallback само по име на терена.
  if (fieldName) {
    const { data, error } = await supabaseClient
      .from("fields")
      .select("id,field_name,city,phone")
      .eq("field_name", fieldName)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id;
  }

  // 4) Fallback по телефон. Пробваме raw и digits, защото в таблиците може да са различно записани.
  if (phoneRaw) {
    const { data, error } = await supabaseClient
      .from("fields")
      .select("id,field_name,city,phone")
      .eq("phone", phoneRaw)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id;
  }

  if (phoneDigits && phoneDigits !== phoneRaw) {
    const { data, error } = await supabaseClient
      .from("fields")
      .select("id,field_name,city,phone")
      .eq("phone", phoneDigits)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id;
  }

  return null;
}

export async function resolveRealFieldId(
  supabaseClient: SupabaseLike,
  fieldRequest: FieldRequestLike | null | undefined,
): Promise<string | null> {
  if (!fieldRequest) return null;
  return findFieldByRequest(supabaseClient, fieldRequest);
}

export async function ensureRealFieldId(
  supabaseClient: SupabaseLike,
  fieldRequest: FieldRequestLike | null | undefined,
): Promise<string | null> {
  if (!fieldRequest) return null;

  const existingId = await findFieldByRequest(supabaseClient, fieldRequest);
  if (existingId) return existingId;

  const fieldName = clean(fieldRequest.field_name);
  const city = clean(fieldRequest.city);
  const phone = clean(fieldRequest.contact_phone || fieldRequest.phone);

  if (!fieldName) return null;

  // Ако активният организатор няма ред в fields, създаваме го автоматично.
  // organizer_id остава NULL, защото в текущата база сочи към стара таблица organizers.
  const { data, error } = await supabaseClient
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

  if (error || !data?.id) return null;
  return data.id;
}
