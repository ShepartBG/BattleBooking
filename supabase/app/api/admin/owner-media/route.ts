import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/authenticatedUser";

const BUCKET = "battlebooking-media";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_KINDS = new Set(["shop-logo", "shop-cover", "event-cover"]);

function extensionFor(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return byType[file.type] || "jpg";
}

export async function POST(request: Request) {
  const { user, admin, isOwner, error } = await getAuthenticatedUser(request);
  if (error || !user || !admin || !isOwner) {
    return NextResponse.json({ ok: false, message: "Само owner може да качва тези снимки." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = String(formData.get("kind") || "");

  if (!(file instanceof File) || !ALLOWED_KINDS.has(kind)) {
    return NextResponse.json({ ok: false, message: "Липсва снимка или валиден тип." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ ok: false, message: "Качвай само JPG, PNG, WEBP или GIF до 10 MB." }, { status: 400 });
  }

  const folder = kind.startsWith("shop-") ? "shops" : "events";
  const path = `${folder}/${kind}-${crypto.randomUUID()}.${extensionFor(file)}`;
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
