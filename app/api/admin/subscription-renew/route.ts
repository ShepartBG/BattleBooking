import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/authenticatedUser";
import { buildRenewalDates } from "@/lib/subscription";
import { sendBattleBookingEmail } from "@/lib/email/emailSender";
import { subscriptionRenewedEmail } from "@/lib/email/fieldRequestEmails";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { admin, isOwner, error } = await getAuthenticatedUser(request);
    if (error || !admin) {
      return NextResponse.json({ ok: false, message: error || "Невалидна сесия." }, { status: 401 });
    }
    if (!isOwner) {
      return NextResponse.json({ ok: false, message: "Само owner може да подновява абонаменти." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const requestId = String(body.requestId || "").trim();
    if (!requestId) {
      return NextResponse.json({ ok: false, message: "Липсва заявка." }, { status: 400 });
    }

    const { data: fieldRequest, error: requestError } = await admin
      .from("field_requests")
      .select("id,email,field_name,subscription_valid_until,grace_until")
      .eq("id", requestId)
      .single();

    if (requestError || !fieldRequest) {
      return NextResponse.json({ ok: false, message: requestError?.message || "Заявката не е намерена." }, { status: 404 });
    }

    const email = String(fieldRequest.email || "").trim().toLowerCase();
    const fieldName = String(fieldRequest.field_name || "Вашето игрище").trim();
    if (!email) {
      return NextResponse.json({ ok: false, message: "Липсва валиден email." }, { status: 400 });
    }

    const dates = buildRenewalDates(fieldRequest.subscription_valid_until);
    const updatePayload = {
      status: "active",
      access_status: "active",
      subscription_valid_until: dates.subscriptionValidUntil,
      grace_until: dates.graceUntil,
      access_blocked_reason: null,
      reviewed_at: new Date().toISOString(),
    };

    const { error: updateError } = await admin
      .from("field_requests")
      .update(updatePayload)
      .eq("id", requestId);

    if (updateError) {
      return NextResponse.json({ ok: false, message: "Неуспешно подновяване: " + updateError.message }, { status: 500 });
    }

    // Keep an organizers mirror in sync when that table is used by the deployment.
    try {
      await admin
        .from("organizers")
        .update({
          status: "active",
          access_status: "active",
          subscription_valid_until: dates.subscriptionValidUntil,
          grace_until: dates.graceUntil,
          access_blocked_reason: null,
        })
        .ilike("email", email);
    } catch {
      // Some installations use only field_requests for subscription state.
    }

    const template = subscriptionRenewedEmail(fieldName, dates.subscriptionValidUntil, dates.graceUntil);
    const emailResult = await sendBattleBookingEmail({
      to: email,
      subject: template.subject,
      text: template.body,
      html: template.html,
    });

    return NextResponse.json({
      ok: true,
      subscriptionValidUntil: dates.subscriptionValidUntil,
      graceUntil: dates.graceUntil,
      message: emailResult.ok
        ? `Абонаментът е подновен до ${dates.subscriptionValidUntil} и email е изпратен.`
        : `Абонаментът е подновен до ${dates.subscriptionValidUntil}, но email не беше изпратен.`,
      email: emailResult,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Неочаквана грешка." },
      { status: 500 },
    );
  }
}
