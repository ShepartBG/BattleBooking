import { supabase } from "@/lib/supabase";
import { isOwnerEmail } from "@/lib/access";

export type CurrentFieldContext = {
  userEmail: string;
  isOwner: boolean;
  fieldId: string | null;
};

export async function getCurrentFieldContext(): Promise<CurrentFieldContext> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user?.email) {
    throw new Error(userError?.message || "Няма активна login сесия.");
  }

  const userEmail = userData.user.email.toLowerCase();
  const owner = isOwnerEmail(userEmail);

  const { data: fieldProfile, error: fieldError } = await supabase
    .from("field_requests")
    .select("id,status,access_status")
    .eq("email", userEmail)
    .in("status", ["active", "payment_pending", "suspended"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fieldError) {
    throw new Error(fieldError.message);
  }

  if (!fieldProfile?.id) {
    if (owner) return { userEmail, isOwner: true, fieldId: null };
    throw new Error("Не намерих активен профил/игрище за този акаунт.");
  }

  return { userEmail, isOwner: owner, fieldId: fieldProfile.id };
}

export function requireFieldId(context: CurrentFieldContext) {
  if (!context.fieldId && !context.isOwner) {
    throw new Error("Липсва field_id за този организатор.");
  }

  return context.fieldId;
}
