const CONFIG_OWNER_EMAILS = (process.env.NEXT_PUBLIC_OWNER_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const FALLBACK_OWNER_EMAILS = [
  "battlebooking@abv.bg",
  "battlebooking.bg@gmail.com",
];

export const OWNER_EMAILS = Array.from(
  new Set([...CONFIG_OWNER_EMAILS, ...FALLBACK_OWNER_EMAILS]),
);

export function isOwnerEmail(email?: string | null) {
  if (!email) return false;

  const normalizedEmail = email.trim().toLowerCase();

  return OWNER_EMAILS.includes(normalizedEmail);
}
