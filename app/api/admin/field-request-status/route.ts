import { NextResponse } from "next/server";
import { fieldRequestDecisionEmail } from "@/lib/email/fieldRequestEmails";
import { sendBattleBookingEmail } from "@/lib/email/emailSender";
import type { FieldRequestStatus } from "@/lib/fieldRequests";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getResetPasswordRedirect } from "@/lib/authRedirect";
import { buildTrialDates } from "@/lib/subscription";
import { ensureOrganizerField } from "@/lib/server/ensureOrganizerField";
import { getAuthenticatedUser } from "@/lib/server/authenticatedUser";

const allowedStatuses: FieldRequestStatus[] = [
  "payment_pending",
  "active",
  "suspended",
  "rejected",
];

function randomPassword() {
  const part = Math.random().toString(36).slice(2);
  const part2 = Math.random().toString(36).slice(2);
  return `BB-${part}-${part2}-2026!`;
}


export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (auth.error || !auth.admin) {
      return NextResponse.json({ ok: false, message: auth.error || "Невалидна сесия." }, { status: 401 });
    }
    if (!auth.isOwner) {
      return NextResponse.json({ ok: false, message: "Само owner може да променя достъпа." }, { status: 403 });
    }
    const body = await request.json();
    const requestId = String(body.requestId || "").trim();
    const status = String(body.status || "") as FieldRequestStatus;

    if (!requestId || !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { ok: false, message: "Липсва заявка или валиден статус." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: fieldRequest, error: requestError } = await supabaseAdmin
      .from("field_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !fieldRequest) {
      return NextResponse.json(
        { ok: false, message: requestError?.message || "Заявката не е намерена." },
        { status: 404 },
      );
    }

    const email = String(fieldRequest.email || "").trim().toLowerCase();
    const fieldName = String(fieldRequest.field_name || "Вашето игрище").trim();

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "Заявката няма валиден email." },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, unknown> = {
      status,
      access_status: status,
      reviewed_at: new Date().toISOString(),
    };

    let resetUrl: string | null = null;
    let dates: ReturnType<typeof buildTrialDates> | null = null;

    if (status === "active") {
      dates = buildTrialDates();
      updatePayload.trial_started_at = dates.trialStartedAt;
      updatePayload.subscription_valid_until = dates.subscriptionValidUntil;
      updatePayload.grace_until = dates.graceUntil;
      updatePayload.access_blocked_reason = null;

      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listError) {
        return NextResponse.json(
          { ok: false, message: "Не успях да проверя auth потребителите: " + listError.message },
          { status: 500 },
        );
      }

      const existingUser = existingUsers.users.find(
        (user) => user.email?.trim().toLowerCase() === email,
      );

      if (!existingUser) {
        const { error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: randomPassword(),
          email_confirm: true,
          user_metadata: {
            field_request_id: requestId,
            field_name: fieldName,
          },
        });

        if (createError) {
          return NextResponse.json(
            { ok: false, message: "Не успях да създам login акаунт: " + createError.message },
            { status: 500 },
          );
        }
      }

      const redirectTo = getResetPasswordRedirect(request.headers.get("origin"));

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo },
      });

      if (linkError) {
        return NextResponse.json(
          { ok: false, message: "Не успях да генерирам линк за парола: " + linkError.message },
          { status: 500 },
        );
      }

      // Create/link the real fields row immediately when the organizer is approved.
      // This prevents a successful login with a missing field_id in the admin panel.
      const realFieldId = await ensureOrganizerField(fieldRequest);
      updatePayload.field_id = realFieldId;

      resetUrl = linkData.properties?.action_link || null;

      if (!resetUrl) {
        return NextResponse.json(
          { ok: false, message: "Supabase не върна валиден action_link за смяна на парола." },
          { status: 500 },
        );
      }
    }

    if (status === "suspended") {
      updatePayload.access_blocked_reason =
        "Достъпът Ви е временно ограничен. За повече информация се свържете с BattleBooking.";
    }

    const template = fieldRequestDecisionEmail(status, fieldName, {
      resetUrl,
      subscriptionValidUntil: dates?.subscriptionValidUntil || fieldRequest.subscription_valid_until,
      graceUntil: dates?.graceUntil || fieldRequest.grace_until,
    });

    updatePayload.decision_message = template.body;

    const { error: updateError } = await supabaseAdmin
      .from("field_requests")
      .update(updatePayload)
      .eq("id", requestId);

    if (updateError) {
      return NextResponse.json(
        { ok: false, message: "Грешка при промяна на статуса: " + updateError.message },
        { status: 500 },
      );
    }

    const emailResult = await sendBattleBookingEmail({
      to: email,
      subject: template.subject,
      text: template.body,
      html: template.html,
    });

    return NextResponse.json({
      ok: true,
      message: emailResult.ok
        ? "Статусът е запазен, login акаунтът е готов и email е изпратен."
        : "Статусът е запазен, но email engine не изпрати писмо.",
      email: emailResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Неочаквана грешка.",
      },
      { status: 500 },
    );
  }
}
