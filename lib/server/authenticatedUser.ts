import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isOwnerEmail } from "@/lib/access";
import { getOrganizerAccess } from "@/lib/server/organizerAccess";

export async function getAuthenticatedUser(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!url || !anon || !token) return { user: null, admin: null, isOwner: false, error: "Невалидна сесия." };
  const authClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user?.email) return { user: null, admin: null, isOwner: false, error: error?.message || "Невалидна сесия." };
  let admin: any;
  try { admin = getSupabaseAdmin(); } catch { admin = authClient; }
  const email = data.user.email.toLowerCase();
  const isOwner = isOwnerEmail(email);
  // A valid login is not enough: suspended / expired / unapproved organizers are refused server-side too.
  if (!isOwner) {
    const access = await getOrganizerAccess(email, admin);
    if (!access.allowed) return { user: null, admin: null, isOwner: false, error: access.message };
  }
  return { user: { ...data.user, email }, admin, isOwner, error: null };
}
