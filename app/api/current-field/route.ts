import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isOwnerEmail } from "@/lib/access";
import { ensureOrganizerField } from "@/lib/server/ensureOrganizerField";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getToken(request: Request) {
  return (request.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) throw new Error("Supabase public env липсва.");

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: Request) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ ok: false, message: "Липсва login token." }, { status: 401 });
    }

    const authClient = getAuthClient();
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    const email = userData.user?.email?.trim().toLowerCase() || "";

    if (userError || !email) {
      return NextResponse.json({ ok: false, message: "Невалидна login сесия." }, { status: 401 });
    }

    if (isOwnerEmail(email)) {
      return NextResponse.json({ ok: true, userEmail: email, isOwner: true, fieldId: null });
    }

    const admin = getSupabaseAdmin();
    const { data: fieldRequest, error } = await admin
      .from("field_requests")
      .select("id,field_id,field_name,city,phone,contact_phone,status,access_status")
      .eq("email", email)
      .in("status", ["active", "payment_pending", "suspended"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }

    if (!fieldRequest?.id) {
      return NextResponse.json(
        { ok: false, message: "Не намерих активен профил/игрище за този акаунт." },
        { status: 404 },
      );
    }

    const fieldId = await ensureOrganizerField(fieldRequest);

    return NextResponse.json({ ok: true, userEmail: email, isOwner: false, fieldId });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Неочаквана грешка." },
      { status: 500 },
    );
  }
}
