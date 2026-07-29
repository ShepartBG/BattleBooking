import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/authenticatedUser";

const GALLERY_LIMIT = 10;

async function owns(admin: any, email: string, fieldId: string) {
  const normalizedEmail = email.toLowerCase();

  // Existing BattleBooking ownership is stored in field_requests.field_id.
  const { data: request } = await admin
    .from("field_requests")
    .select("field_id")
    .ilike("email", normalizedEmail)
    .eq("field_id", fieldId)
    .maybeSingle();

  if (request) return true;

  // New multi-field profiles use fields.owner_email after the v1.8.2 migration.
  // Ignore a missing-column error so existing profiles keep working before migration.
  const { data: field } = await admin
    .from("fields")
    .select("id")
    .eq("id", fieldId)
    .ilike("owner_email", normalizedEmail)
    .maybeSingle();

  return Boolean(field);
}

export async function GET(request: Request) {
  const { user, admin, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) {
    return NextResponse.json({ ok: false, message: error }, { status: 401 });
  }

  const fieldId = new URL(request.url).searchParams.get("field_id") || "";
  if (!(await owns(admin, user.email!, fieldId))) {
    return NextResponse.json({ ok: false, message: "Нямаш достъп." }, { status: 403 });
  }

  const { data, error: queryError } = await admin
    .from("field_images")
    .select("id,image_url,caption,sort_order,position_x,position_y,created_at")
    .eq("field_id", fieldId)
    .neq("image_url", "")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (queryError) {
    return NextResponse.json({ ok: false, message: queryError.message }, { status: 500 });
  }

  const images = data || [];
  return NextResponse.json({
    ok: true,
    images,
    count: images.length,
    limit: GALLERY_LIMIT,
    remaining: Math.max(0, GALLERY_LIMIT - images.length),
  });
}

export async function POST(request: Request) {
  const { user, admin, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) {
    return NextResponse.json({ ok: false, message: error }, { status: 401 });
  }

  const body = await request.json();
  const fieldId = String(body.field_id || "");
  const imageUrl = String(body.image_url || "").trim();

  if (!imageUrl) {
    return NextResponse.json({ ok: false, message: "Липсва адрес на снимката." }, { status: 400 });
  }

  if (!(await owns(admin, user.email!, fieldId))) {
    return NextResponse.json({ ok: false, message: "Нямаш достъп." }, { status: 403 });
  }

  const { count, error: countError } = await admin
    .from("field_images")
    .select("id", { count: "exact", head: true })
    .eq("field_id", fieldId)
    .neq("image_url", "");

  if (countError) {
    return NextResponse.json({ ok: false, message: countError.message }, { status: 500 });
  }

  const currentCount = count || 0;
  if (currentCount >= GALLERY_LIMIT) {
    return NextResponse.json(
      { ok: false, message: `Галерията вече съдържа ${currentCount} от ${GALLERY_LIMIT} снимки. Изтрий снимка, за да качиш нова.` },
      { status: 400 },
    );
  }

  const { data, error: queryError } = await admin
    .from("field_images")
    .insert({
      field_id: fieldId,
      image_url: imageUrl,
      caption: String(body.caption || "").trim(),
      sort_order: currentCount,
      position_x: Number(body.position_x ?? 50),
      position_y: Number(body.position_y ?? 50),
    })
    .select("id,image_url,caption,sort_order,position_x,position_y,created_at")
    .single();

  if (queryError) {
    return NextResponse.json({ ok: false, message: queryError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, image: data });
}

export async function PUT(request: Request) {
  const { user, admin, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) return NextResponse.json({ ok: false, message: error }, { status: 401 });
  const body = await request.json();
  const id = String(body.id || "");
  const { data: image } = await admin.from("field_images").select("id,field_id").eq("id", id).maybeSingle();
  if (!image || !(await owns(admin, user.email!, image.field_id))) return NextResponse.json({ ok: false, message: "Нямаш достъп." }, { status: 403 });
  const update = { position_x: Math.max(0, Math.min(100, Number(body.position_x ?? 50))), position_y: Math.max(0, Math.min(100, Number(body.position_y ?? 50))) };
  const { data, error: queryError } = await admin.from("field_images").update(update).eq("id", id).select("id,image_url,caption,sort_order,position_x,position_y").single();
  return queryError ? NextResponse.json({ ok: false, message: queryError.message }, { status: 500 }) : NextResponse.json({ ok: true, image: data });
}

export async function DELETE(request: Request) {
  const { user, admin, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) {
    return NextResponse.json({ ok: false, message: error }, { status: 401 });
  }

  const body = await request.json();
  const { data: image } = await admin
    .from("field_images")
    .select("id,field_id,image_url")
    .eq("id", String(body.id || ""))
    .maybeSingle();

  if (!image || !(await owns(admin, user.email!, image.field_id))) {
    return NextResponse.json({ ok: false, message: "Нямаш достъп." }, { status: 403 });
  }

  const { error: queryError } = await admin.from("field_images").delete().eq("id", image.id);

  if (queryError) {
    return NextResponse.json({ ok: false, message: queryError.message }, { status: 500 });
  }

  const marker = "/storage/v1/object/public/battlebooking-media/";
  const markerIndex = String(image.image_url || "").indexOf(marker);
  if (markerIndex >= 0) {
    const path = decodeURIComponent(String(image.image_url).slice(markerIndex + marker.length));
    await admin.storage.from("battlebooking-media").remove([path]);
  }

  return NextResponse.json({ ok: true });
}
