import type { FieldRequestStatus } from "@/lib/fieldRequests";

export type EmailTemplate = {
  subject: string;
  body: string;
  html: string;
};

const BRAND_GREEN = "#95c900";
const BRAND_GREEN_LIGHT = "#b7ef16";

function buildEmailHtml({
  title,
  intro,
  body,
  ctaLabel,
  ctaUrl,
}: {
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  const paragraphs = body
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map(
      (line) =>
        `<p style="margin:0 0 14px;color:#d4d4d8;font-size:15px;line-height:1.7;">${escapeHtml(
          line,
        )}</p>`,
    )
    .join("");

  const button =
    ctaLabel && ctaUrl
      ? `<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;margin-top:12px;background:${BRAND_GREEN};color:#050505;text-decoration:none;font-weight:900;padding:14px 20px;border-radius:16px;">${escapeHtml(
          ctaLabel,
        )}</a>`
      : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#050505;padding:0;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border:1px solid rgba(149,201,0,0.25);border-radius:28px;overflow:hidden;background:#0b0b0b;">
            <tr>
              <td style="padding:28px;background:linear-gradient(135deg,rgba(149,201,0,0.25),rgba(0,0,0,0));border-bottom:1px solid rgba(255,255,255,0.08);">
                <div style="color:${BRAND_GREEN_LIGHT};font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">BattleBooking</div>
                <h1 style="margin:12px 0 0;color:#ffffff;font-size:32px;line-height:1.15;font-weight:900;">${escapeHtml(
                  title,
                )}</h1>
                <p style="margin:14px 0 0;color:#d4d4d8;font-size:16px;line-height:1.6;">${escapeHtml(
                  intro,
                )}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${paragraphs}
                ${button}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px;border-top:1px solid rgba(255,255,255,0.08);background:#080808;">
                <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.6;">Поздрави,<br><strong style="color:#ffffff;">Екипът на BattleBooking</strong></p>
                <p style="margin:14px 0 0;color:#71717a;font-size:12px;line-height:1.6;">Този email е изпратен автоматично от BattleBooking.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function fieldRequestReceivedEmail(fieldName: string): EmailTemplate {
  const safeName = fieldName || "Вашето игрище";
  const body = `Здравейте,

Благодарим Ви, че заявихте достъп до BattleBooking за ${safeName}.

Получихме Вашата заявка и нашият екип ще я разгледа възможно най-скоро.

След като прегледаме информацията за Вашето игрище, ще се свържем с Вас с повече подробности относно следващите стъпки, активирането на профила и условията за използване на платформата.

Поздрави,
Екипът на BattleBooking`;

  return {
    subject: "Получихме заявката Ви за BattleBooking",
    body,
    html: buildEmailHtml({
      title: "Получихме заявката Ви",
      intro: `Заявката за ${safeName} е приета за преглед.`,
      body: `Здравейте,

Благодарим Ви, че заявихте достъп до BattleBooking за ${safeName}.

Получихме Вашата заявка и нашият екип ще я разгледа възможно най-скоро.

След като прегледаме информацията за Вашето игрище, ще се свържем с Вас с повече подробности относно следващите стъпки, активирането на профила и условията за използване на платформата.`,
    }),
  };
}

export function fieldRequestDecisionEmail(
  status: FieldRequestStatus,
  fieldName: string,
): EmailTemplate {
  const safeName = fieldName || "Вашето игрище";

  if (status === "active" || status === "payment_pending") {
    const body = `Здравейте,

Поздравления!

Вашата заявка за достъп до BattleBooking за ${safeName} беше одобрена.

Следващата стъпка е активиране на Вашия организаторски профил. Нашият екип ще се свърже с Вас, за да уточним финалните детайли, начина на плащане и стартирането на Вашето игрище в платформата.

Очакваме с нетърпение да работим заедно.

Поздрави,
Екипът на BattleBooking`;

    return {
      subject: "Вашата заявка за BattleBooking е одобрена",
      body,
      html: buildEmailHtml({
        title: "Заявката Ви е одобрена",
        intro: `${safeName} е одобрено за BattleBooking.`,
        body: `Здравейте,

Поздравления!

Вашата заявка за достъп до BattleBooking за ${safeName} беше одобрена.

Следващата стъпка е активиране на Вашия организаторски профил. Нашият екип ще се свърже с Вас, за да уточним финалните детайли, начина на плащане и стартирането на Вашето игрище в платформата.

Очакваме с нетърпение да работим заедно.`,
      }),
    };
  }

  if (status === "rejected") {
    const body = `Здравейте,

Благодарим Ви за интереса към BattleBooking.

След преглед на подадената информация за ${safeName}, на този етап не можем да активираме достъп за Вашето игрище.

Това не означава, че възможността е окончателно затворена. При промяна на обстоятелствата или при допълнителна информация, можете да се свържете отново с нас.

Поздрави,
Екипът на BattleBooking`;

    return {
      subject: "Отговор относно заявката Ви за BattleBooking",
      body,
      html: buildEmailHtml({
        title: "Отговор относно заявката Ви",
        intro: `Прегледахме заявката за ${safeName}.`,
        body: `Здравейте,

Благодарим Ви за интереса към BattleBooking.

След преглед на подадената информация за ${safeName}, на този етап не можем да активираме достъп за Вашето игрище.

Това не означава, че възможността е окончателно затворена. При промяна на обстоятелствата или при допълнителна информация, можете да се свържете отново с нас.`,
      }),
    };
  }

  if (status === "suspended") {
    const body = `Здравейте,

Достъпът до BattleBooking за ${safeName} е временно спрян.

Можете да се свържете с нашия екип за повече информация.

Поздрави,
Екипът на BattleBooking`;

    return {
      subject: "BattleBooking: достъпът е временно спрян",
      body,
      html: buildEmailHtml({
        title: "Достъпът е временно спрян",
        intro: `Достъпът за ${safeName} е временно спрян.`,
        body: `Здравейте,

Достъпът до BattleBooking за ${safeName} е временно спрян.

Можете да се свържете с нашия екип за повече информация.`,
      }),
    };
  }

  return fieldRequestReceivedEmail(safeName);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
