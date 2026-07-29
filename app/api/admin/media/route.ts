import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/authenticatedUser";

const BUCKET = "battlebooking-media";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFor(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return byType[file.type] || "jpg";
}

async function canManageField(admin: any, email: string, fieldId: string, isOwner: boolean) {
  if (isOwner) return true;

  const normalizedEmail = email.toLowerCase();
  const { data: ownedField } = await admin
    .from("fields")
    .select("id")
    .eq("id", fieldId)
    .ilike("owner_email", normalizedEmail)
    .maybeSingle();

  if (ownedField) return true;

  const { data: request } = await admin
    .from("field_requests")
    .select("field_id")
    .eq("field_id", fieldId)
    .ilike("email", normalizedEmail)
    .maybeSingle();

  return Boolean(request);
}

export async function POST(request: Request) {
  const { user, admin, isOwner, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin) {
    return NextResponse.json({ ok: false, message: error || "Невалидна сесия." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const fieldId = String(formData.get("field_id") || "");
  const kind = String(formData.get("kind") || "gallery");

  if (!(file instanceof File) || !fieldId) {
    return NextResponse.json({ ok: false, message: "Липсва снимка или игрище." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ ok: false, message: "Качвай само JPG, PNG, WEBP или GIF до 10 MB." }, { status: 400 });
  }

  if (!(await canManageField(admin, user.email || "", fieldId, isOwner))) {
    return NextResponse.json({ ok: false, message: "Нямаш достъп до това игрище." }, { status: 403 });
  }

  const folder = kind === "logo" || kind === "background" ? "profile" : "gallery";
  const safeKind = kind === "logo" || kind === "background" ? kind : "image";
  const path = `fields/${fieldId}/${folder}/${safeKind}-${crypto.randomUUID()}.${extensionFor(file)}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, cacheControl: "3600", upsert: false });

  if (uploadError) {
    return NextResponse.json({ ok: false, message: uploadError.message }, { status: 500 });
  }

  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, path, publicUrl });
}
