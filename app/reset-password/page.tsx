"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import PublicShell from "@/components/public/PublicShell";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Новата парола трябва да бъде поне 6 символа.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Двете пароли не съвпадат.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("Линкът е изтекъл или невалиден. Заяви нов линк от 'Забравена парола'.");
      return;
    }

    setMessage("Паролата е сменена успешно. Прехвърлям те към вход...");
    setTimeout(() => router.replace("/login"), 1200);
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
            New Password
          </p>
          <h1 className="mt-3 text-4xl font-black">Нова парола</h1>
          <p className="mt-3 leading-7 text-zinc-400">
            Въведи новата парола за organizer акаунта.
          </p>

          <label className="mt-6 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Нова парола
            </span>
            <input
              className="bb-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Повтори паролата
            </span>
            <input
              className="bb-input"
              type="password"
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </label>

          {error && <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}
          {message && <div className="mt-4 rounded-2xl border border-lime-400/25 bg-lime-500/10 p-4 text-sm font-bold text-lime-200">{message}</div>}

          <button
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-lime-500 px-5 py-4 font-black text-black transition hover:bg-lime-400 disabled:opacity-60"
          >
            {loading ? "Запазване..." : "Запази новата парола"}
          </button>
        </form>
      </section>
    </PublicShell>
  );
}
