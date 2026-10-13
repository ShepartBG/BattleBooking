import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrganizerAccess } from "@/lib/server/organizerAccess";
import { isOwnerEmail } from "@/lib/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getToken(request: Request) {
  return (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

function getPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase public env липсва.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: Request) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ ok: false, allowed: false, message: "Липсва login token." }, { status: 401 });
    }

    const publicClient = getPublicClient();
    const { data: userData, error: userError } = await publicClient.auth.getUser(token);
    const email = userData.user?.email?.trim().toLowerCase() || "";

    if (userError || !email) {
      return NextResponse.json({ ok: false, allowed: false, message: "Невалидна login сесия." }, { status: 401 });
    }

    if (isOwnerEmail(email)) {
      return NextResponse.json({ ok: true, allowed: true, message: "" });
    }

    const access = await getOrganizerAccess(email);
    if (access.error) {
      return NextResponse.json({ ok: false, allowed: false, message: access.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, allowed: access.allowed, message: access.message });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        allowed: false,
        message: error instanceof Error ? error.message : "Неочаквана грешка при проверка на достъпа.",
      },
      { status: 500 },
    );
  }
}
