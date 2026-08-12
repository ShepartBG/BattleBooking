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
  const fieldId = String(formData.get("field_id") || "");
  const kind = String(formData.get("kind") || "gallery");
  const manyFiles = formData.getAll("files").filter((value): value is File => value instanceof File);
  const singleFile = formData.get("file");
  const files = manyFiles.length > 0
    ? manyFiles
    : singleFile instanceof File
      ? [singleFile]
      : [];

  if (files.length === 0 || !fieldId) {
    return NextResponse.json({ ok: false, message: "Липсва снимка или игрище." }, { status: 400 });
  }

  if (files.length > 10) {
    return NextResponse.json({ ok: false, message: "Можеш да качиш най-много 10 снимки наведнъж." }, { status: 400 });
  }

  const invalidFile = files.find((file) => !ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE);
  if (invalidFile) {
    return NextResponse.json({ ok: false, message: "Качвай само JPG, PNG, WEBP или GIF до 10 MB на снимка." }, { status: 400 });
  }

  if (!(await canManageField(admin, user.email || "", fieldId, isOwner))) {
    return NextResponse.json({ ok: false, message: "Нямаш достъп до това игрище." }, { status: 403 });
  }

  const folder = kind === "logo" || kind === "background" ? "profile" : "gallery";
  const safeKind = kind === "logo" || kind === "background" ? kind : "image";
  const uploaded: Array<{ path: string; publicUrl: string }> = [];

  for (const file of files) {
    const path = `fields/${fieldId}/${folder}/${safeKind}-${crypto.randomUUID()}.${extensionFor(file)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type, cacheControl: "3600", upsert: false });

    if (uploadError) {
      // Do not leave half of a failed batch in storage.
      if (uploaded.length > 0) {
        await admin.storage.from(BUCKET).remove(uploaded.map((item) => item.path));
      }
      return NextResponse.json({ ok: false, message: uploadError.message }, { status: 500 });
    }

    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    uploaded.push({ path, publicUrl });
  }

  // Keep backwards compatibility with existing single-file callers (logo/background).
  if (uploaded.length === 1) {
    return NextResponse.json({ ok: true, ...uploaded[0], uploaded });
  }

  return NextResponse.json({ ok: true, uploaded });
}
