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
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
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

    const duplicateCheck = await checkActiveFieldRequest({ email, phone, fieldName });

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

    await sendReceivedEmail({
      email,
      fieldName,
      ownerName,
      city,
      phone,
      website,
      facebook,
      instagram,
      tiktok,
      message,
    });

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
      <section className="mx-auto grid w-full max-w-7xl gap-5 px-3 py-6 sm:px-4 sm:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-black/60 p-5 sm:rounded-[2.4rem] sm:p-8 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
              Join BattleBooking
            </p>
            <h1 className="bb-mobile-title mt-3 text-[2.45rem] font-black leading-[0.98] tracking-tight sm:text-5xl md:text-7xl">
              Регистрирай игрище
            </h1>
            <p className="mt-5 text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
              Изпрати заявка за достъп до BattleBooking. След преглед и
              одобрение игрището получава собствен профил, настройки и удобен
              начин за управление на игри, участници и комплекти под наем.
            </p>
          </div>

          <a
            href="/about"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl sm:w-fit border border-[#95c900]/30 bg-[#95c900]/10 px-5 py-3 text-sm font-black text-[#b7ef16] transition hover:border-[#b7ef16]/60 hover:bg-[#95c900]/15 hover:text-white"
          >
            Имаш нужда от повече информация <span aria-hidden="true">→</span>
          </a>

          <div className="grid gap-3 sm:grid-cols-3">
            <Status
              title="Заявка"
              text="Организаторът подава основните данни."
              active
            />
            <Status
              title="Преглед"
              text="BattleBooking проверява информацията."
            />
            <Status title="Достъп" text="Одобрение и активиране на профила." />
          </div>

          <div className="rounded-[1.5rem] border border-[#95c900]/35 sm:rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(149,201,0,0.2),transparent_36%),rgba(0,0,0,0.7)] p-4 backdrop-blur-xl sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#b7ef16]">
              Organizer Plan
            </p>
            <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-black sm:text-3xl">55 € / месец</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Първият месец е безплатен тестов достъп. След това абонаментът е 55 € / месец, без дългосрочен договор.
                </p>
              </div>
              <div className="rounded-2xl border border-[#95c900]/25 bg-[#95c900]/10 px-4 py-3 text-sm font-black text-[#b7ef16]">
                Стартова цена
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#95c900]/20 bg-black/60 p-4 backdrop-blur-xl sm:p-6">
            <h2 className="text-2xl font-black text-[#b7ef16]">
              Какво получава игрището?
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
              <li>✅ Собствена страница в BattleBooking</li>
              <li>✅ Игри с отделен линк за записване</li>
              <li>✅ Admin dashboard за играчи, наеми и статус</li>
              <li>✅ Ясна организация на записванията и участниците</li>
            </ul>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#95c900]/20 bg-black/65 p-4 backdrop-blur-xl sm:p-6">
          <h2 className="text-2xl font-black sm:text-3xl">Заявка за достъп</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Задължителни са само полетата със звездичка. Линковете към website и
            социални мрежи са по желание.
          </p>

          <div className="mt-5 rounded-2xl border border-[#95c900]/30 bg-[#95c900]/10 p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b7ef16]">
                  Месечен абонамент
                </p>
                <p className="mt-1 text-2xl font-black sm:text-3xl text-white">
                  55 € / месец
                </p>
              </div>
              <p className="max-w-sm text-sm leading-6 text-zinc-300">
                Включва 1 месец безплатен тест, игри, регистрации, admin панел, настройки и статистики.
              </p>
            </div>
          </div>

          {sent && (
            <div className="mt-5 rounded-2xl border border-[#95c900]/35 bg-[#95c900]/10 p-4 text-sm font-bold text-[#b7ef16]">
              Заявката е приета. Ще се свържем с теб след преглед.
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-5 grid gap-3 sm:gap-4">
            <Field label="Име на игрището *">
              <input
                name="field_name"
                className="bb-input"
                maxLength={80}
                placeholder="Airsoft Field Warzone"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Име на организатора *">
                <input
                  name="owner_name"
                  className="bb-input"
                  maxLength={80}
                  placeholder="Християн Иванов"
                />
              </Field>
              <Field label="Град / Локация *">
                <input
                  name="city"
                  className="bb-input"
                  maxLength={120}
                  placeholder="с. Бутан / Враца / София"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Телефон *">
                <input
                  name="phone"
                  className="bb-input"
                  inputMode="tel"
                  maxLength={20}
                  placeholder="0897047668"
                />
              </Field>
              <Field label="Email *">
                <input
                  name="email"
                  type="email"
                  className="bb-input"
                  maxLength={120}
                  placeholder="field@example.com"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Website">
                <input
                  name="website"
                  className="bb-input"
                  maxLength={180}
                  placeholder="https://example.com"
                />
                <OptionalHint />
              </Field>
              <Field label="Facebook">
                <input
                  name="facebook"
                  className="bb-input"
                  maxLength={180}
                  placeholder="линк към Facebook страница"
                />
                <OptionalHint />
              </Field>
              <Field label="Instagram">
                <input
                  name="instagram"
                  className="bb-input"
                  maxLength={180}
                  placeholder="линк към Instagram"
                />
                <OptionalHint />
              </Field>
              <Field label="TikTok">
                <input
                  name="tiktok"
                  className="bb-input"
                  maxLength={180}
                  placeholder="линк към TikTok"
                />
                <OptionalHint />
              </Field>
            </div>

            <Field label="Кратко описание">
              <textarea
                name="message"
                className="bb-input min-h-28"
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Разкажи накратко за игрището, капацитет, локация, игри и комплекти."
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <OptionalHint className="mt-0" />
                <span className="block text-xs font-bold text-zinc-500">
                  {description.length}/500
                </span>
              </div>
            </Field>

            <button
              disabled={isSubmitting || sent}
              className="rounded-2xl bg-[#95c900] px-5 py-4 text-center font-black text-black transition hover:bg-[#b7ef16] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sent ? "✓ Заявката е изпратена" : isSubmitting ? "Изпращане..." : "Заяви достъп"}
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

async function sendReceivedEmail({
  email,
  fieldName,
  ownerName,
  city,
  phone,
  website,
  facebook,
  instagram,
  tiktok,
  message,
}: {
  email: string;
  fieldName: string;
  ownerName: string;
  city: string;
  phone: string;
  website: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  message: string;
}) {
  try {
    const response = await fetch("/api/email/field-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        fieldName,
        ownerName,
        city,
        phone,
        website,
        facebook,
        instagram,
        tiktok,
        message,
      }),
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
  if (!isValidBgPhone(data.phone))
    return "Заявката не беше приета. Въведи валиден български мобилен номер с 10 цифри. Пример: 0897047668.";
  if (!isValidEmail(data.email)) return "Моля, въведи валиден email адрес.";

  const links = [
    data.website,
    data.facebook,
    data.instagram,
    data.tiktok,
  ].filter(Boolean);
  if (links.some((link) => link.length > 180))
    return "Някой от линковете е прекалено дълъг. Максимум 180 символа.";
  if (data.message.length > 500)
    return "Описанието трябва да е максимум 500 символа.";

  return "";
}

async function checkActiveFieldRequest({
  email,
  phone,
  fieldName,
}: {
  email: string;
  phone: string;
  fieldName: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);
  const normalizedFieldName = normalizeFieldName(fieldName);

  const { data, error } = await supabase
    .from("field_requests")
    .select("id,status,email,phone,field_name")
    .in("status", ["pending", "payment_pending", "active", "suspended"])
    .limit(500);

  if (error) {
    return { request: undefined, error };
  }

  const request = (data || []).find((item) => {
    const itemEmail = String(item.email || "").trim().toLowerCase();
    const itemPhone = normalizePhone(String(item.phone || ""));
    const itemFieldName = normalizeFieldName(String(item.field_name || ""));

    return (
      itemEmail === normalizedEmail ||
      itemPhone === normalizedPhone ||
      itemFieldName === normalizedFieldName
    );
  });

  return {
    request: request as
      | {
          id: string;
          status: string;
          email: string;
          phone: string;
          field_name: string;
        }
      | undefined,
    error: null,
  };
}

function getDuplicateMessage(status: string) {
  const contact = "Моля, свържи се с нас на battlebooking@abv.bg или 0897 047 668.";

  if (status === "active") {
    return `Вече има активен достъп или регистрирано игрище с тези данни. ${contact}`;
  }

  if (status === "payment_pending") {
    return `Вече има заявка с тези данни, която очаква финално потвърждение. ${contact}`;
  }

  if (status === "suspended") {
    return `Има спрян достъп или заявка с тези данни. ${contact}`;
  }

  return `Вече имате изпратена заявка към BattleBooking. Ако смятате, че има грешка или се нуждаете от съдействие, ${contact}`;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function normalizeFieldName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zа-я0-9]/gi, "")
    .trim();
}

function isValidBgPhone(phone: string) {
  return /^08\d{8}$/.test(phone);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function OptionalHint({ className = "" }: { className?: string }) {
  return (
    <span
      className={`mt-2 block text-[11px] font-bold leading-4 text-zinc-500 ${className}`}
    >
      Полето не е задължително за попълване.
    </span>
  );
}

function Status({
  title,
  text,
  active = false,
}: {
  title: string;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-xl ${active ? "border-[#95c900]/35 bg-[#95c900]/10" : "border-white/10 bg-black/55"}`}
    >
      <p
        className={
          active ? "font-black text-[#b7ef16]" : "font-black text-white"
        }
      >
        {title}
      </p>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{text}</p>
    </div>
  );
}
