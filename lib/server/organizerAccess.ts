import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Server-side organizer access rules (subscription / suspension / approval).
 * Shared by /api/auth/check-access and getAuthenticatedUser, so every admin API
 * enforces the same rules the admin UI shows — not just a valid login token.
 */

export type OrganizerAccess = { allowed: boolean; message: string; error?: string };

const BLOCKED_MESSAGE =
  "Достъпът Ви е временно ограничен. За повече информация се свържете с BattleBooking.";

function normalizeStatus(row: any) {
  return String(row?.access_status || row?.status || "").toLowerCase().trim();
}

function isAllowedStatus(row: any) {
  const status = normalizeStatus(row);
  return status === "active" || status === "approved" || status === "trial" || status === "payment_pending";
}

function isSuspendedStatus(row: any) {
  const status = normalizeStatus(row);
  return status === "suspended" || status === "restricted" || status === "blocked" || status === "expired";
}

function isOutOfGrace(row: any) {
  const graceUntil = row?.grace_until || row?.subscription_valid_until || row?.access_valid_until;
  if (!graceUntil) return false;
  return new Date().toISOString().slice(0, 10) > String(graceUntil).slice(0, 10);
}

async function findProfile(admin: any, email: string) {
  const requestResult = await admin
    .from("field_requests")
    .select("id,email,status,access_status,subscription_valid_until,grace_until,access_blocked_reason,field_id")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (requestResult.error || requestResult.data) return requestResult;

  // Optional legacy mirror table; its columns differ between installations.
  const organizerResult = await admin
    .from("organizers")
    .select("*")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  return organizerResult.error ? { data: null, error: null } : organizerResult;
}

export async function getOrganizerAccess(email: string, admin: any = getSupabaseAdmin()): Promise<OrganizerAccess> {
  const normalized = email.trim().toLowerCase();
  const { data: profile, error } = await findProfile(admin, normalized);

  if (error) {
    return { allowed: false, message: error.message || "Грешка при проверка на достъпа.", error: error.message };
  }

  if (!profile) {
    return {
      allowed: false,
      message: "Няма активен BattleBooking достъп за този email. Ако смяташ, че има грешка, свържи се с BattleBooking.",
    };
  }

  if (isSuspendedStatus(profile) || isOutOfGrace(profile)) {
    return { allowed: false, message: profile.access_blocked_reason || BLOCKED_MESSAGE };
  }

  if (!isAllowedStatus(profile)) {
    return {
      allowed: false,
      message: "Акаунтът Ви все още не е активиран. Моля, изчакайте одобрение от BattleBooking.",
    };
  }

  return { allowed: true, message: "" };
}
