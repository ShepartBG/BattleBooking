export const OWNER_EMAILS = (process.env.NEXT_PUBLIC_OWNER_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isOwnerEmail(email?: string | null) {
  if (!email) return false;

  const normalizedEmail = email.trim().toLowerCase();

  if (OWNER_EMAILS.length === 0) return false;

  return OWNER_EMAILS.includes(normalizedEmail);
}
