import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type RateLimitAction = "registration" | "login_failed" | "password_reset";

const RATE_LIMIT_RULES: Record<RateLimitAction, { limit: number; windowSeconds: number }> = {
  registration: { limit: 3, windowSeconds: 10 * 60 },
  login_failed: { limit: 3, windowSeconds: 10 * 60 },
  password_reset: { limit: 2, windowSeconds: 60 * 60 },
};

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "unknown";
}

export function sanitizePlainText(value: unknown, maxLength = 500) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim()
    .slice(0, maxLength);
}

export function isValidName(value: string) {
  return /^[A-Za-zА-Яа-яЁёІіЇїЄєЪъЬь\s'-]{2,40}$/.test(value.trim());
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function isValidPhone(value: string) {
  return /^\d{10}$/.test(value);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function checkRateLimit(action: RateLimitAction, identifier: string) {
  const rule = RATE_LIMIT_RULES[action];
  const supabase = getSupabaseAdmin();
  const windowStart = new Date(Date.now() - rule.windowSeconds * 1000).toISOString();

  const { count, error } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("action", action)
    .eq("identifier", identifier)
    .gte("created_at", windowStart);

  if (error) {
    console.error("Rate limit check error", error);
    return { allowed: true, remaining: rule.limit };
  }

  const used = count || 0;
  return { allowed: used < rule.limit, remaining: Math.max(0, rule.limit - used) };
}

export async function consumeRateLimit(action: RateLimitAction, identifier: string, metadata?: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("rate_limit_events").insert({
    action,
    identifier,
    metadata: metadata || {},
  });

  if (error) console.error("Rate limit consume error", error);
}
