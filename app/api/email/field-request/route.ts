import { NextResponse } from "next/server";
import {
  fieldRequestOwnerNotificationEmail,
  fieldRequestReceivedEmail,
} from "@/lib/email/fieldRequestEmails";
import { sendBattleBookingEmail } from "@/lib/email/emailSender";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const fieldName = String(body.fieldName || "").trim();
    const ownerName = String(body.ownerName || "").trim();
    const city = String(body.city || "").trim();
    const phone = String(body.phone || "").trim();
    const website = String(body.website || "").trim() || null;
    const facebook = String(body.facebook || "").trim() || null;
    const instagram = String(body.instagram || "").trim() || null;
    const tiktok = String(body.tiktok || "").trim() || null;
    const message = String(body.message || "").trim() || null;

    if (!email || !fieldName) {
      return NextResponse.json(
        { ok: false, message: "Липсва email или име на игрището." },
        { status: 400 },
      );
    }

    const requesterTemplate = fieldRequestReceivedEmail(fieldName);
    const requesterResult = await sendBattleBookingEmail({
      to: email,
      subject: requesterTemplate.subject,
      text: requesterTemplate.body,
      html: requesterTemplate.html,
    });

    const ownerEmail =
      process.env.BATTLEBOOKING_OWNER_EMAIL || "battlebooking@abv.bg";
    const ownerTemplate = fieldRequestOwnerNotificationEmail({
      fieldName,
      ownerName,
      city,
      phone,
      email,
      website,
      facebook,
      instagram,
      tiktok,
      message,
    });

    const ownerResult = await sendBattleBookingEmail({
      to: ownerEmail,
      subject: ownerTemplate.subject,
      text: ownerTemplate.body,
      html: ownerTemplate.html,
    });

    const ok = Boolean(
      requesterResult.ok ||
        ownerResult.ok ||
        requesterResult.skipped ||
        ownerResult.skipped,
    );

    return NextResponse.json(
      {
        ok,
        requester: requesterResult,
        owner: ownerResult,
        message:
          requesterResult.ok && ownerResult.ok
            ? "Email-ите са изпратени успешно."
            : requesterResult.skipped || ownerResult.skipped
              ? "Email engine не е конфигуриран. Заявката е запазена."
              : "Заявката е запазена, но възникна проблем при изпращане на email.",
      },
      { status: ok ? 200 : 500 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Неочаквана грешка при изпращане на email.",
      },
      { status: 500 },
    );
  }
}
