export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type SendEmailResult = {
  ok: boolean;
  skipped?: boolean;
  message: string;
  id?: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendBattleBookingEmail({
  to,
  subject,
  text,
  html,
}: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      message:
        "RESEND_API_KEY липсва. Email-ът не е изпратен, но заявката/статусът са запазени.",
    };
  }

  const from =
    process.env.BATTLEBOOKING_EMAIL_FROM ||
    "BattleBooking <onboarding@resend.dev>";
  const replyTo = process.env.BATTLEBOOKING_EMAIL_REPLY_TO || undefined;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
      reply_to: replyTo,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      message:
        payload?.message ||
        payload?.error ||
        `Resend върна грешка: ${response.status}`,
    };
  }

  return {
    ok: true,
    message: "Email-ът е изпратен успешно.",
    id: payload?.id,
  };
}
