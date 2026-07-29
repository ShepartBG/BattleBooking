import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/authenticatedUser";
import { createFieldSlug } from "@/lib/fieldSettings";

export const dynamic = "force-dynamic";

const allowedFieldKeys = [
  "field_name",
  "public_slug",
  "public_region",
  "public_settlement",
  "public_location",
  "public_description",
  "phone",
  "contact_phone",
  "logo_url",
  "background_url",
  "logo_x",
  "logo_y",
  "background_x",
  "background_y",
  "public_own_price",
  "public_rental_price",
  "facebook",
  "instagram",
  "tiktok",
  "default_max_rental_sets",
  "default_rules_text",
  "default_game_description",
] as const;

function cleanPayload(body: Record<string, unknown>) {
  const payload: Record<string, string | number> = {};

  for (const key of allowedFieldKeys) {
    if (!(key in body)) continue;
    if (["default_max_rental_sets", "logo_x", "logo_y", "background_x", "background_y"].includes(key)) {
      payload[key] = Math.max(0, Number(body[key] || 0));
    } else {
      payload[key] = String(body[key] || "").trim();
    }
  }

  if ("own_price" in body && !("public_own_price" in body)) {
    payload.public_own_price = String(body.own_price || "").trim();
  }
  if ("rental_price" in body && !("public_rental_price" in body)) {
    payload.public_rental_price = String(body.rental_price || "").trim();
  }

  if (payload.field_name) {
    payload.public_slug = createFieldSlug(
      String(payload.public_slug || payload.field_name),
    );
  }

  return payload;
}

export async function GET(request: Request) {
  const { user, admin, isOwner, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) {
    return NextResponse.json({ ok: false, message: error }, { status: 401 });
  }

  const email = String(user.email || "").toLowerCase();
  let fieldsQuery = admin
    .from("fields")
    .select("*")
    .order("created_at", { ascending: true });

  if (!isOwner) fieldsQuery = fieldsQuery.ilike("owner_email", email);
  const { data, error: qError } = await fieldsQuery;

  if (qError) {
    return NextResponse.json({ ok: false, message: qError.message }, { status: 500 });
  }

  // Backward-compatible fallback for the original approved field.
  if (!data?.length) {
    const { data: req } = await admin
      .from("field_requests")
      .select("*")
      .ilike("email", email)
      .in("status", ["active", "payment_pending", "suspended"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (req?.field_id) {
      const { data: field } = await admin
        .from("fields")
        .select("*")
        .eq("id", req.field_id)
        .maybeSingle();

      if (field) {
        return NextResponse.json({
          ok: true,
          fields: [
            {
              ...field,
              owner_email: email,
              public_slug: req.public_slug,
              public_region: req.public_region,
              public_settlement: req.public_settlement,
              public_location: req.public_location,
              public_description: req.public_description,
              logo_url: req.logo_url,
              background_url: req.background_url,
              contact_phone: req.contact_phone || req.phone,
              public_own_price: req.own_price,
              public_rental_price: req.rental_price,
              facebook: req.facebook,
              instagram: req.instagram,
              tiktok: req.tiktok,
            },
          ],
        });
      }
    }
  }

  return NextResponse.json({ ok: true, fields: data || [] });
}

export async function POST(request: Request) {
  const { user, admin, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) {
    return NextResponse.json({ ok: false, message: error }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const payload = cleanPayload(body);
  const name = String(payload.field_name || "").trim();

  if (!name) {
    return NextResponse.json(
      { ok: false, message: "Името е задължително." },
      { status: 400 },
    );
  }

  // There is intentionally no `active` column here. Existing BattleBooking
  // databases use field_requests.status for access and publication state.
  const { data, error: qError } = await admin
    .from("fields")
    .insert({
      ...payload,
      owner_email: String(user.email || "").toLowerCase(),
      owner_user_id: user.id,
    })
    .select("*")
    .single();

  if (qError) {
    return NextResponse.json({ ok: false, message: qError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, field: data });
}

export async function PUT(request: Request) {
  const { user, admin, isOwner, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) {
    return NextResponse.json({ ok: false, message: error }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id || "");
  const email = String(user.email || "").toLowerCase();

  let owned = isOwner;
  if (!owned) {
    const { data } = await admin
      .from("fields")
      .select("id")
      .eq("id", id)
      .ilike("owner_email", email)
      .maybeSingle();
    owned = Boolean(data);
  }

  if (!owned) {
    return NextResponse.json(
      { ok: false, message: "Нямаш достъп до това игрище." },
      { status: 403 },
    );
  }

  const update = cleanPayload(body);
  const { data, error: qError } = await admin
    .from("fields")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (qError) {
    return NextResponse.json({ ok: false, message: qError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, field: data });
}


function storagePathFromPublicUrl(value: string) {
  const marker = "/storage/v1/object/public/battlebooking-media/";
  const index = value.indexOf(marker);
  return index >= 0 ? decodeURIComponent(value.slice(index + marker.length)) : "";
}

export async function DELETE(request: Request) {
  const { user, admin, isOwner, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) {
    return NextResponse.json({ ok: false, message: error }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const id = String(body.id || "");
  const email = String(user.email || "").toLowerCase();
  if (!id) return NextResponse.json({ ok: false, message: "Липсва игрище." }, { status: 400 });

  const { data: field, error: fieldError } = await admin
    .from("fields")
    .select("id,owner_email,logo_url,background_url")
    .eq("id", id)
    .maybeSingle();

  if (fieldError) return NextResponse.json({ ok: false, message: fieldError.message }, { status: 500 });
  if (!field) return NextResponse.json({ ok: false, message: "Игрището не съществува." }, { status: 404 });

  let allowed = isOwner || String(field.owner_email || "").toLowerCase() === email;
  if (!allowed) {
    const { data: requestOwner } = await admin
      .from("field_requests")
      .select("field_id")
      .eq("field_id", id)
      .ilike("email", email)
      .maybeSingle();
    allowed = Boolean(requestOwner);
  }
  if (!allowed) return NextResponse.json({ ok: false, message: "Нямаш достъп до това игрище." }, { status: 403 });

  const { data: galleryRows } = await admin
    .from("field_images")
    .select("image_url")
    .eq("field_id", id);

  const { data: gameRows, error: gamesReadError } = await admin
    .from("games")
    .select("id")
    .eq("field_id", id);
  if (gamesReadError) return NextResponse.json({ ok: false, message: gamesReadError.message }, { status: 500 });

  const gameIds = (gameRows || []).map((game: any) => game.id);
  if (gameIds.length) {
    const { error: registrationsError } = await admin.from("registrations").delete().in("game_id", gameIds);
    if (registrationsError) return NextResponse.json({ ok: false, message: registrationsError.message }, { status: 500 });

    const { error: gamesDeleteError } = await admin.from("games").delete().in("id", gameIds);
    if (gamesDeleteError) return NextResponse.json({ ok: false, message: gamesDeleteError.message }, { status: 500 });
  }

  const { error: imagesDeleteError } = await admin.from("field_images").delete().eq("field_id", id);
  if (imagesDeleteError) return NextResponse.json({ ok: false, message: imagesDeleteError.message }, { status: 500 });

  await admin.from("field_requests").update({ field_id: null }).eq("field_id", id);

  const { error: deleteError } = await admin.from("fields").delete().eq("id", id);
  if (deleteError) return NextResponse.json({ ok: false, message: deleteError.message }, { status: 500 });

  const paths = [
    ...(galleryRows || []).map((row: any) => storagePathFromPublicUrl(String(row.image_url || ""))),
    storagePathFromPublicUrl(String(field.logo_url || "")),
    storagePathFromPublicUrl(String(field.background_url || "")),
  ].filter(Boolean);
  if (paths.length) await admin.storage.from("battlebooking-media").remove(paths);

  return NextResponse.json({ ok: true });
}
