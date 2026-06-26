"use client";

import { useState } from "react";
import PublicShell from "@/components/public/PublicShell";
import { supabase } from "@/lib/supabase";
import { fieldRequestReceivedEmail } from "@/lib/email/fieldRequestEmails";

type FormAlert = {
  type: "error" | "success";
  message: string;
};

export default function RegisterFieldPage() {
  const [sent, setSent] = useState(false);
  const [alert, setAlert] = useState<FormAlert | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(false);
    setAlert(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const fieldName = String(formData.get("field_name") || "").trim();
    const ownerName = String(formData.get("owner_name") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const phone = normalizePhone(String(formData.get("phone") || ""));
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const website = String(formData.get("website") || "").trim();
    const facebook = String(formData.get("facebook") || "").trim();
    const instagram = String(formData.get("instagram") || "").trim();
    const tiktok = String(formData.get("tiktok") || "").trim();
    const message = String(formData.get("message") || "").trim();

    const validationError = validateRequest({
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

    if (validationError) {
      setAlert({ type: "error", message: validationError });
      return;
    }

    setIsSubmitting(true);

    const duplicateCheck = await checkActiveFieldRequest({ email, phone });

    if (duplicateCheck.error) {
      setIsSubmitting(false);
      setAlert({
        type: "error",
        message:
          "Заявката не беше изпратена. Възникна грешка при проверка на данните. Моля, опитай отново.",
      });
      return;
    }

    if (duplicateCheck.request) {
      setIsSubmitting(false);
      setAlert({
        type: "error",
        message: getDuplicateMessage(duplicateCheck.request.status),
      });
      return;
    }

    const receivedEmail = fieldRequestReceivedEmail(fieldName);

    const { error } = await supabase.from("field_requests").insert({
      field_name: fieldName,
      owner_name: ownerName,
      email,
      phone,
      city,
      website: website || null,
      facebook: facebook || null,
      instagram: instagram || null,
      tiktok: tiktok || null,
      message: message || null,
      status: "pending",
      decision_message: receivedEmail.body,
    });

    setIsSubmitting(false);

    if (error) {
      setAlert({
        type: "error",
        message:
          "Заявката не беше изпратена. Провери дали си пуснал SQL файла в Supabase. Детайл: " +
          error.message,
      });
      return;
    }

    await sendReceivedEmail({ email, fieldName });

    setSent(true);
    setDescription("");
    setAlert({
      type: "success",
      message:
        "Заявката е изпратена успешно. Благодарим за интереса към BattleBooking — ще се свържем с теб след преглед.",
    });
    form.reset();
  }

  return (
    <PublicShell>
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-5">
          <div className="rounded-[2.4rem] border border-white/10 bg-black/60 p-8 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
              Join BattleBooking
            </p>
            <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">
              Регистрирай игрище
            </h1>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Изпрати заявка за достъп до BattleBooking. След одобрение
              игрището получава собствен профил, настройки и регистрация за игри.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Status title="Request" text="Организаторът подава заявка." active />
            <Status title="Review" text="BattleBooking преглежда данните." />
            <Status title="Access" text="Одобрение, плащане и активиране." />
          </div>

          <div className="rounded-[2rem] border border-[#95c900]/35 bg-[radial-gradient(circle_at_top_left,rgba(149,201,0,0.2),transparent_36%),rgba(0,0,0,0.7)] p-6 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#b7ef16]">
              Organizer Plan
            </p>
            <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-3xl font-black">55 € / месец</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Месечен абонамент за използване на BattleBooking. Без дългосрочен договор.
                </p>
              </div>
              <div className="rounded-2xl border border-[#95c900]/25 bg-[#95c900]/10 px-4 py-3 text-sm font-black text-[#b7ef16]">
                Beta цена
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#95c900]/20 bg-black/60 p-6 backdrop-blur-xl">
            <h2 className="text-2xl font-black text-[#b7ef16]">Какво получава игрището?</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
              <li>✅ Собствена страница в BattleBooking</li>
              <li>✅ Игри с отделен линк за записване</li>
              <li>✅ Admin dashboard за играчи, наеми и статус</li>
              <li>✅ Бъдещи модули: QR check-in, analytics, профили и плащания</li>
            </ul>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#95c900]/20 bg-black/65 p-6 backdrop-blur-xl">
          <h2 className="text-3xl font-black">Заявка за достъп</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Задължителни са само основните данни. Website и социални мрежи са по желание.
          </p>

          <div className="mt-5 rounded-2xl border border-[#95c900]/30 bg-[#95c900]/10 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b7ef16]">Месечен абонамент</p>
                <p className="mt-1 text-3xl font-black text-white">55 € / месец</p>
              </div>
              <p className="max-w-sm text-sm leading-6 text-zinc-300">
                Включва игри, регистрации, admin панел, настройки, статистики и бъдещи обновления.
              </p>
            </div>
          </div>

          {sent && (
            <div className="mt-5 rounded-2xl border border-[#95c900]/35 bg-[#95c900]/10 p-4 text-sm font-bold text-[#b7ef16]">
              Заявката е приета. Ще се свържем с теб след преглед.
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-4">
            <Field label="Име на игрището *">
              <input name="field_name" className="bb-input" maxLength={80} placeholder="Airsoft Field Warzone" />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Име на организатора *">
                <input name="owner_name" className="bb-input" maxLength={80} placeholder="Християн Иванов" />
              </Field>
              <Field label="Град / Локация *">
                <input name="city" className="bb-input" maxLength={120} placeholder="с. Бутан / Враца / София" />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Телефон *">
                <input name="phone" className="bb-input" inputMode="tel" maxLength={20} placeholder="0897047668" />
              </Field>
              <Field label="Email *">
                <input name="email" type="email" className="bb-input" maxLength={120} placeholder="field@example.com" />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Website">
                <input name="website" className="bb-input" maxLength={180} placeholder="https://example.com" />
              </Field>
              <Field label="Facebook">
                <input name="facebook" className="bb-input" maxLength={180} placeholder="линк към Facebook страница" />
              </Field>
              <Field label="Instagram">
                <input name="instagram" className="bb-input" maxLength={180} placeholder="линк към Instagram" />
              </Field>
              <Field label="TikTok">
                <input name="tiktok" className="bb-input" maxLength={180} placeholder="линк към TikTok" />
              </Field>
            </div>

            <Field label="Кратко описание">
              <textarea
                name="message"
                className="bb-input min-h-32"
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Разкажи накратко за игрището, капацитет, локация, игри и комплекти."
              />
              <span className="mt-2 block text-right text-xs font-bold text-zinc-500">
                {description.length}/500
              </span>
            </Field>

            <button
              disabled={isSubmitting}
              className="rounded-2xl bg-[#95c900] px-5 py-4 text-center font-black text-black transition hover:bg-[#b7ef16] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Изпращане..." : "Заяви достъп"}
            </button>

            {alert && (
              <div
                className={`rounded-2xl border p-4 text-sm font-bold ${
                  alert.type === "error"
                    ? "border-red-400/35 bg-red-500/10 text-red-200"
                    : "border-[#95c900]/35 bg-[#95c900]/10 text-[#b7ef16]"
                }`}
              >
                {alert.type === "error" ? "❌ " : "✅ "}
                {alert.message}
              </div>
            )}
          </form>
        </div>
      </section>
    </PublicShell>
  );
}

async function sendReceivedEmail({ email, fieldName }: { email: string; fieldName: string }) {
  try {
    const response = await fetch("/api/email/field-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fieldName }),
    });

    const data = await response.json().catch(() => null);
    return { ok: Boolean(data?.ok), message: String(data?.message || "") };
  } catch {
    return { ok: false, message: "Email service error" };
  }
}

function validateRequest(data: {
  fieldName: string;
  ownerName: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  message: string;
}) {
  if (!data.fieldName) return "Моля, въведи име на игрището.";
  if (!data.ownerName) return "Моля, въведи име на организатора.";
  if (!data.city) return "Моля, въведи град или локация.";
  if (!isValidBgPhone(data.phone)) return "Заявката не беше приета. Въведи валиден български мобилен номер с 10 цифри. Пример: 0897047668.";
  if (!isValidEmail(data.email)) return "Моля, въведи валиден email адрес.";

  const links = [data.website, data.facebook, data.instagram, data.tiktok].filter(Boolean);
  if (links.some((link) => link.length > 180)) return "Някой от линковете е прекалено дълъг. Максимум 180 символа.";
  if (data.message.length > 500) return "Описанието трябва да е максимум 500 символа.";

  return "";
}

async function checkActiveFieldRequest({ email, phone }: { email: string; phone: string }) {
  const { data, error } = await supabase
    .from("field_requests")
    .select("id,status,email,phone")
    .or(`email.eq.${email},phone.eq.${phone}`)
    .in("status", ["pending", "payment_pending", "active", "suspended"])
    .limit(1);

  return {
    request: data?.[0] as { id: string; status: string; email: string; phone: string } | undefined,
    error,
  };
}

function getDuplicateMessage(status: string) {
  if (status === "active") {
    return "За този телефон или email вече има активен достъп до BattleBooking.";
  }

  if (status === "payment_pending") {
    return "За този телефон или email вече има заявка, която очаква плащане.";
  }

  if (status === "suspended") {
    return "За този телефон или email има спрян достъп. Моля, свържи се с екипа на BattleBooking.";
  }

  return "За този телефон или email вече има активна заявка за достъп. Ще се свържем с теб след преглед.";
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function isValidBgPhone(phone: string) {
  return /^08\d{8}$/.test(phone);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Status({ title, text, active = false }: { title: string; text: string; active?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 backdrop-blur-xl ${active ? "border-[#95c900]/35 bg-[#95c900]/10" : "border-white/10 bg-black/55"}`}>
      <p className={active ? "font-black text-[#b7ef16]" : "font-black text-white"}>{title}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{text}</p>
    </div>
  );
}
