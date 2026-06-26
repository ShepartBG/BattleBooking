import { NextResponse } from "next/server";
import { fieldRequestReceivedEmail } from "@/lib/email/fieldRequestEmails";
import { sendBattleBookingEmail } from "@/lib/email/emailSender";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const fieldName = String(body.fieldName || "").trim();

    if (!email || !fieldName) {
      return NextResponse.json(
        { ok: false, message: "Липсва email или име на игрището." },
        { status: 400 },
      );
    }

    const template = fieldRequestReceivedEmail(fieldName);
    const result = await sendBattleBookingEmail({
      to: email,
      subject: template.subject,
      text: template.body,
      html: template.html,
    });

    return NextResponse.json(result, { status: result.ok || result.skipped ? 200 : 500 });
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
