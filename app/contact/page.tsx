"use client";

import { useState } from "react";
import PublicShell from "@/components/public/PublicShell";

const CONTACT_REQUESTS_KEY = "battlebooking-contact-requests-v1";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type StoredContact = {
  phone: string;
  email: string;
  createdAt: number;
};

export default function ContactPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const phone = normalizePhone(String(formData.get("phone") || ""));
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const topic = String(formData.get("topic") || "").trim();
    const msg = String(formData.get("message") || "").trim();

    if (!name) return setError("Моля, въведете име.");
    if (!isValidBgPhone(phone)) return setError("Моля, въведете валиден телефон. Пример: 0897047668.");
    if (!isValidEmail(email)) return setError("Моля, въведете валиден имейл.");
    if (!topic) return setError("Моля, изберете тема.");
    if (!msg) return setError("Моля, въведете съобщение.");
    if (msg.length > 500) return setError("Съобщението трябва да е максимум 500 символа.");

    const existing = readStoredContacts();
    const now = Date.now();
    const activeDuplicate = existing.find(
      (item) =>
        now - item.createdAt < ONE_WEEK_MS &&
        (item.phone === phone || item.email === email),
    );

    if (activeDuplicate) {
      return setError(
        "Може да изпратиш само 1 запитване на седмица от същия телефон или имейл.",
      );
    }

    localStorage.setItem(
      CONTACT_REQUESTS_KEY,
      JSON.stringify([
        ...existing.filter((item) => now - item.createdAt < ONE_WEEK_MS),
        { phone, email, createdAt: now },
      ]),
    );

    setSent(true);
    setMessage("");
    form.reset();
  }

  return (
    <PublicShell>
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2.4rem] border border-white/10 bg-black/60 p-8 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
            Contact
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">
            Контакти
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            Тази страница е за връзка с BattleBooking — за организатори,
            партньори, играчи и бъдещи клиенти.
          </p>

          <div className="mt-8 grid gap-3">
            <Info label="Телефон" value="0897 047 668" />
            <Info label="Email" value="battlebooking@abv.bg" />
            <Info
              label="За партньори"
              value="Airsoft, Paintball, Laser Tag и event формати"
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-[#95c900]/20 bg-black/65 p-6 backdrop-blur-xl">
          <h2 className="text-3xl font-black">Изпрати запитване</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Запитванията са ограничени до 1 на седмица от същия телефон или имейл.
          </p>

          {sent && (
            <div className="mt-5 rounded-2xl border border-lime-400/35 bg-lime-500/10 p-4 text-sm font-bold text-lime-200">
              Запитването е прието. Ще се свържем с теб след преглед.
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-2xl border border-red-400/35 bg-red-500/10 p-4 text-sm font-bold text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 grid gap-4">
            <Field label="Име *">
              <input name="name" className="bb-input" maxLength={80} placeholder="Име и фамилия" />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Телефон *">
                <input name="phone" className="bb-input" inputMode="tel" maxLength={20} placeholder="0897047668" />
              </Field>
              <Field label="Email *">
                <input name="email" type="email" className="bb-input" maxLength={120} placeholder="example@email.com" />
              </Field>
            </div>

            <Field label="Тема *">
              <select name="topic" className="bb-input" defaultValue="">
                <option value="" disabled>Избери тема</option>
                <option value="player">Въпрос като играч</option>
                <option value="partner">Партньорство</option>
                <option value="technical">Технически въпрос</option>
                <option value="other">Друго</option>
              </select>
            </Field>

            <Field label="Съобщение *">
              <textarea
                name="message"
                className="bb-input min-h-36"
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Напиши съобщение..."
              />
              <span className="mt-2 block text-right text-xs font-bold text-zinc-500">
                {message.length}/500
              </span>
            </Field>
            <button className="rounded-2xl bg-[#95c900] px-5 py-4 font-black text-black transition hover:bg-[#b7ef16]">
              Изпрати запитване
            </button>
          </form>
        </div>
      </section>
    </PublicShell>
  );
}

function readStoredContacts(): StoredContact[] {
  try {
    return JSON.parse(localStorage.getItem(CONTACT_REQUESTS_KEY) || "[]") as StoredContact[];
  } catch {
    return [];
  }
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 font-bold text-white">{value}</p>
    </div>
  );
}
