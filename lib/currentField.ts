import { supabase } from "@/lib/supabase";

export type CurrentFieldContext = {
  userEmail: string;
  isOwner: boolean;
  fieldId: string | null;
};

type CurrentFieldResponse = {
  ok?: boolean;
  userEmail?: string;
  isOwner?: boolean;
  fieldId?: string | null;
  message?: string;
};

export async function getCurrentFieldContext(): Promise<CurrentFieldContext> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (sessionError || !token) {
    throw new Error(sessionError?.message || "Няма активна login сесия.");
  }

  const response = await fetch("/api/current-field", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const result = (await response.json().catch(() => ({}))) as CurrentFieldResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.message || "Не успях да намеря профила на организатора.");
  }

  return {
    userEmail: String(result.userEmail || "").toLowerCase(),
    isOwner: Boolean(result.isOwner),
    fieldId: result.fieldId || null,
  };
}

export function requireFieldId(context: CurrentFieldContext) {
  if (!context.fieldId && !context.isOwner) {
    throw new Error("Липсва field_id за този организатор.");
  }

  return context.fieldId;
}
