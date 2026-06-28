"use client";

import { FormEvent, useState } from "react";
import PublicShell from "@/components/public/PublicShell";
import { supabase } from "@/lib/supabase";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isValidEmail(email)) {
      setError("Моля, въведете валиден имейл.");
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setLoading(false);

    if (resetError) {
      setError("Не успях да изпратя линк за нова парола. Провери имейла и опитай пак.");
      return;
    }

    setMessage("Изпратихме линк за смяна на парола. Провери имейла си.");
  }

  return (
    <PublicShell>
      <section className="mx-auto flex min-h-[calc(100vh-180px)] max-w-3xl items-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-[2rem] border border-lime-400/15 bg-black/70 p-6 shadow-[0_0_70px_rgba(0,0,0,.45)] backdrop-blur-xl"
          noValidate
        >
          <p className="text-xs font-black uppercase tracking-[0.3em] text-lime-300">
            Password Recovery
          </p>
          <h1 className="mt-3 text-4xl font-black">Забравена парола</h1>
          <p className="mt-3 leading-7 text-zinc-400">
            Въведи имейла на organizer акаунта. Ще получиш автоматичен линк, през който да зададеш нова парола.
          </p>

          <label className="mt-6 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Email
            </span>
            <input
              className="bb-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="organizer@email.com"
              autoComplete="email"
            />
          </label>

          {error && <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}
          {message && <div className="mt-4 rounded-2xl border border-lime-400/25 bg-lime-500/10 p-4 text-sm font-bold text-lime-200">{message}</div>}

          <button
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-lime-500 px-5 py-4 font-black text-black transition hover:bg-lime-400 disabled:opacity-60"
          >
            {loading ? "Изпращане..." : "Изпрати линк"}
          </button>

          <a href="/login" className="mt-5 inline-block text-sm font-bold text-lime-300 hover:text-lime-100">
            Обратно към вход
          </a>
        </form>
      </section>
    </PublicShell>
  );
}
