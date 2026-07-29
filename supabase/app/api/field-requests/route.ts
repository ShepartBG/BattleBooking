import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getClientIp,
  isValidEmail,
  isValidName,
  isValidPhone,
  normalizePhone,
  sanitizePlainText,
} from "@/lib/security";

function normalizeOptionalUrl(value: unknown) {
  const cleaned = sanitizePlainText(value, 300);
  if (!cleaned) return null;
  try {
    const url = new URL(cleaned.startsWith("http") ? cleaned : `https://${cleaned}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeFieldName(value: unknown) {
  return sanitizePlainText(value, 80).toLocaleLowerCase("bg-BG").replace(/\s+/g, " ");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Невалидна заявка." }, { status: 400 });
  }

  const action = body.action === "check" ? "check" : "create";
  const email = sanitizePlainText(body.email, 120).toLowerCase();
  const phone = normalizePhone(String(body.phone || ""));
  const fieldName = sanitizePlainText(body.field_name, 80);

  if (!isValidEmail(email) || !isValidPhone(phone) || fieldName.length < 2) {
    return NextResponse.json({ error: "Невалидни данни за заявката." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: candidates, error: duplicateError } = await supabase
    .from("field_requests")
    .select("id,status,email,phone,field_name")
    .in("status", ["pending", "payment_pending", "active", "suspended"])
    .limit(500);

  if (duplicateError) {
    console.error("Field request duplicate check failed", duplicateError);
    return NextResponse.json({ error: "Грешка при проверка на заявката." }, { status: 500 });
  }

  const normalizedName = normalizeFieldName(fieldName);
  let duplicate = (candidates || []).find((item) => {
    return (
      String(item.email || "").trim().toLowerCase() === email ||
      normalizePhone(String(item.phone || "")) === phone ||
      normalizeFieldName(item.field_name) === normalizedName
    );
  });

  if (!duplicate) {
    const { data: sameNameRows, error: sameNameError } = await supabase
      .from("field_requests")
      .select("id,status,email,phone,field_name")
      .in("status", ["pending", "payment_pending", "active", "suspended"])
      .ilike("field_name", fieldName)
      .limit(20);

    if (sameNameError) {
      console.error("Field request name check failed", sameNameError);
      return NextResponse.json({ error: "Грешка при проверка на заявката." }, { status: 500 });
    }

    duplicate = (sameNameRows || []).find(
      (item) => normalizeFieldName(item.field_name) === normalizedName,
    );
  }

  if (action === "check") {
    return NextResponse.json({
      duplicate: duplicate ? { status: duplicate.status } : null,
    });
  }

  if (duplicate) {
    return NextResponse.json(
      { error: "Вече има активна заявка със същите данни.", status: duplicate.status },
      { status: 409 },
    );
  }

  const ownerName = sanitizePlainText(body.owner_name, 80);
  const city = sanitizePlainText(body.city, 120);
  const message = sanitizePlainText(body.message, 500) || null;
  const decisionMessage = sanitizePlainText(body.decision_message, 3000) || null;

  if (!isValidName(ownerName) || city.length < 2) {
    return NextResponse.json({ error: "Невалидно име или населено място." }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("field_requests").insert({
    field_name: fieldName,
    owner_name: ownerName,
    email,
    phone,
    city,
    website: normalizeOptionalUrl(body.website),
    facebook: normalizeOptionalUrl(body.facebook),
    instagram: normalizeOptionalUrl(body.instagram),
    tiktok: normalizeOptionalUrl(body.tiktok),
    message,
    status: "pending",
    access_status: "pending",
    decision_message: decisionMessage,
    admin_notes: null,
    field_id: null,
  });

  if (insertError) {
    console.error("Field request insert failed", {
      insertError,
      ip: getClientIp(request),
    });
    return NextResponse.json({ error: "Заявката не беше записана." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
