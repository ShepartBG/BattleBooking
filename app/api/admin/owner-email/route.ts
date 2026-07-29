import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isOwnerEmail } from "@/lib/access";
import { sendBattleBookingEmail, type EmailAttachment } from "@/lib/email/emailSender";

export const runtime = "nodejs";

const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 15 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value || "")
    .replace(/<\s*\/?\s*(script|iframe|object|embed|svg|link|meta|style)[^>]*>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInline(value: string) {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#ffffff;font-weight:800">$1</strong>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#a3e635;text-decoration:underline">$1</a>');
}

function formatMessageHtml(value: string) {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let orderedItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p style="margin:0 0 16px;font-size:16px;line-height:1.75;color:#d4d4d8">${paragraph.map(formatInline).join("<br>")}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length) {
      blocks.push(`<ul style="margin:2px 0 18px;padding:0;list-style:none">${listItems
        .map((item) => `<li style="margin:0 0 10px;padding:12px 14px;border:1px solid rgba(163,230,53,.16);border-radius:14px;background:rgba(163,230,53,.055);font-size:15px;line-height:1.6;color:#e4e4e7">${formatInline(item)}</li>`)
        .join("")}</ul>`);
      listItems = [];
    }
    if (orderedItems.length) {
      blocks.push(`<ol style="margin:2px 0 18px;padding-left:24px">${orderedItems
        .map((item) => `<li style="margin:0 0 10px;padding-left:4px;font-size:15px;line-height:1.65;color:#e4e4e7">${formatInline(item)}</li>`)
        .join("")}</ol>`);
      orderedItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const unordered = line.match(/^(?:[-•–]|✅|☑️|✔️|➡️)\s*(.+)$/u);
    if (unordered) {
      flushParagraph();
      if (orderedItems.length) flushList();
      listItems.push(`${line.startsWith("✅") || line.startsWith("☑") || line.startsWith("✔") ? "✅ " : "• "}${unordered[1]}`);
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      if (listItems.length) flushList();
      orderedItems.push(ordered[1]);
      continue;
    }

    const markdownHeading = line.match(/^#{1,3}\s+(.+)$/);
    const looksLikeHeading = line.length <= 85 && (line.endsWith(":") || /^[A-ZА-Я0-9][A-ZА-Я0-9\s–—-]{5,}$/u.test(line));
    if (markdownHeading || looksLikeHeading) {
      flushParagraph();
      flushList();
      const title = markdownHeading ? markdownHeading[1] : line.replace(/:$/, "");
      blocks.push(`<h2 style="margin:24px 0 12px;font-size:19px;line-height:1.35;color:#ffffff">${formatInline(title)}</h2>`);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks.join("");
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function requireOwner(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return null;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user || !isOwnerEmail(data.user.email)) return null;
  return data.user;
}

async function filesToAttachments(formData: FormData) {
  const files = formData.getAll("attachments").filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length > MAX_FILES) {
    throw new Error(`Можеш да прикачиш най-много ${MAX_FILES} снимки.`);
  }

  let totalSize = 0;
  const attachments: EmailAttachment[] = [];

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new Error(`Файлът „${file.name}“ не е поддържан. Използвай JPG, PNG, WEBP или GIF.`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Снимката „${file.name}“ е над 5 MB.`);
    }
    totalSize += file.size;
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new Error("Общият размер на снимките не може да надвишава 15 MB.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    attachments.push({
      filename: file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "screenshot.png",
      content: buffer.toString("base64"),
      contentType: file.type,
    });
  }

  return attachments;
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwner(request);
    if (!owner) {
      return NextResponse.json({ ok: false, message: "Нямаш owner достъп." }, { status: 403 });
    }

    const formData = await request.formData();
    const mode = cleanText(formData.get("mode"), 20);
    const recipientEmail = cleanText(formData.get("recipientEmail"), 160).toLowerCase();
    const recipientName = cleanText(formData.get("recipientName"), 120);
    const subject = cleanText(formData.get("subject"), 160);
    const message = cleanText(formData.get("message"), 8000);

    if (!subject || !message) {
      return NextResponse.json({ ok: false, message: "Попълни тема и текст на имейла." }, { status: 400 });
    }

    const attachments = await filesToAttachments(formData);
    const supabaseAdmin = getSupabaseAdmin();
    let recipients: Array<{ email: string; name: string }> = [];

    if (mode === "all") {
      const { data, error } = await supabaseAdmin
        .from("field_requests")
        .select("email, owner_name, field_name, status")
        .eq("status", "active");

      if (error) {
        return NextResponse.json({ ok: false, message: "Не успях да заредя активните организатори: " + error.message }, { status: 500 });
      }

      const unique = new Map<string, string>();
      for (const item of data || []) {
        const email = String(item.email || "").trim().toLowerCase();
        if (validEmail(email) && !unique.has(email)) {
          unique.set(email, String(item.owner_name || item.field_name || "Организатор").trim());
        }
      }
      recipients = Array.from(unique, ([email, name]) => ({ email, name }));
    } else {
      if (!validEmail(recipientEmail)) {
        return NextResponse.json({ ok: false, message: "Получателят няма валиден имейл." }, { status: 400 });
      }
      recipients = [{ email: recipientEmail, name: recipientName || "Организатор" }];
    }

    if (recipients.length === 0) {
      return NextResponse.json({ ok: false, message: "Няма активни организатори с валиден имейл." }, { status: 400 });
    }

    const results = [];
    for (const recipient of recipients) {
      const greeting = `Здравейте${recipient.name ? `, ${recipient.name}` : ""},`;
      const text = `${greeting}\n\n${message}\n\nПоздрави,\nЕкипът на BattleBooking`;
      const formattedMessage = formatMessageHtml(message);
      const html = `<!doctype html>
<html lang="bg">
  <body style="margin:0;padding:0;background:#080a09;font-family:Arial,Helvetica,sans-serif;color:#f4f4f5">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#080a09">
      <tr>
        <td align="center" style="padding:28px 12px">
          <table role="presentation" width="680" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:680px">
            <tr>
              <td style="padding:0 4px 18px;text-align:center">
                <img src="https://battlebooking.bg/icon.png" width="72" height="72" alt="BattleBooking" style="display:block;margin:0 auto 12px;border:0;border-radius:50%">
                <div style="font-size:21px;font-weight:900;letter-spacing:.3px;color:#ffffff">BattleBooking</div>
                <div style="margin-top:5px;font-size:12px;letter-spacing:1.5px;color:#a3e635;text-transform:uppercase">Управление на тактически игри</div>
              </td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid rgba(163,230,53,.24);border-radius:24px;background:#111411;box-shadow:0 18px 50px rgba(0,0,0,.35)">
                <div style="height:5px;background:#84cc16"></div>
                <div style="padding:30px 28px 26px">
                  <div style="display:inline-block;margin-bottom:14px;padding:7px 11px;border-radius:999px;background:rgba(163,230,53,.10);font-size:11px;font-weight:800;letter-spacing:1.7px;color:#bef264;text-transform:uppercase">Официално съобщение</div>
                  <h1 style="margin:0 0 22px;font-size:28px;line-height:1.25;color:#ffffff">${escapeHtml(subject)}</h1>
                  <p style="margin:0 0 20px;font-size:16px;font-weight:800;line-height:1.5;color:#ffffff">${escapeHtml(greeting)}</p>
                  <div>${formattedMessage}</div>
                  ${attachments.length > 0 ? `<div style="margin-top:22px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.045);font-size:13px;line-height:1.55;color:#a1a1aa">📎 Към съобщението ${attachments.length === 1 ? "е прикачено 1 изображение" : `са прикачени ${attachments.length} изображения`}.</div>` : ""}
                  <div style="margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,.1);font-size:14px;line-height:1.7;color:#a1a1aa">
                    С уважение,<br>
                    <strong style="font-size:15px;color:#bef264">Екипът на BattleBooking</strong>
                  </div>
                  <div style="margin-top:22px;text-align:center">
                    <a href="https://battlebooking.bg" style="display:inline-block;padding:12px 20px;border-radius:13px;background:#84cc16;color:#0a0a0a;font-size:14px;font-weight:900;text-decoration:none">Отвори BattleBooking</a>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 18px 0;text-align:center;font-size:11px;line-height:1.65;color:#71717a">
                Получавате този имейл, защото сте активен организатор в BattleBooking.<br>
                <a href="https://battlebooking.bg" style="color:#a3e635;text-decoration:none">battlebooking.bg</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

      const result = await sendBattleBookingEmail({
        to: recipient.email,
        subject,
        text,
        html,
        attachments,
      });
      results.push({ email: recipient.email, ...result });
    }

    const sent = results.filter((result) => result.ok).length;
    const skipped = results.filter((result) => result.skipped).length;
    const failed = results.length - sent - skipped;

    return NextResponse.json({
      ok: failed === 0 && (sent > 0 || skipped > 0),
      sent,
      skipped,
      failed,
      total: results.length,
      message:
        failed === 0
          ? sent > 0
            ? `Имейлът е изпратен успешно до ${sent} ${sent === 1 ? "организатор" : "организатори"}.`
            : "Email engine не е конфигуриран."
          : `Изпратени: ${sent}. Неуспешни: ${failed}.`,
      results,
    }, { status: failed === 0 ? 200 : 500 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Неочаквана грешка при изпращане на имейл." },
      { status: 500 },
    );
  }
}
