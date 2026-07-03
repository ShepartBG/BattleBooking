"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PublicShell from "@/components/public/PublicShell";
import { supabase } from "@/lib/supabase";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Проверявам линка...");
  const [loading, setLoading] = useState(false);
  const [linkReady, setLinkReady] = useState(false);

  useEffect(() => {
    async function prepareSession() {
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage("");
          setError("Линкът е изтекъл или невалиден. Заяви нов линк.");
          return;
        }

        setLinkReady(true);
        setMessage("");
        return;
      }

      setMessage("");
      setError("Няма активен линк за смяна на парола.");
    }

    prepareSession();
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Паролата трябва да бъде поне 6 символа.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Двете пароли не съвпадат.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError("Не успях да сменя паролата. Заяви нов линк.");
      return;
    }

    router.replace("/login");
  }

  return (
    <PublicShell>
      <section className="mx-auto flex min-h-[calc(100vh-180px)] max-w-3xl items-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-[2rem] border border-lime-400/15 bg-black/70 p-6 shadow-[0_0_70px_rgba(0,0,0,.45)] backdrop-blur-xl"
        >
          <p className="text-xs font-black uppercase tracking-[0.3em] text-lime-300">
            New Password
          </p>

          <h1 className="mt-3 text-4xl font-black">Нова парола</h1>

          <p className="mt-3 leading-7 text-zinc-400">
            Въведи новата парола за organizer акаунта.
          </p>

          <input
            className="bb-input mt-6"
            type="password"
            placeholder="Нова парола"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!linkReady || loading}
          />

          <input
            className="bb-input mt-4"
            type="password"
            placeholder="Повтори паролата"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            disabled={!linkReady || loading}
          />

          {error && (
            <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-2xl border border-lime-400/25 bg-lime-500/10 p-4 text-sm font-bold text-lime-200">
              {message}
            </div>
          )}

          <button
            disabled={loading || !linkReady}
            className="mt-6 w-full rounded-2xl bg-lime-500 px-5 py-4 font-black text-black transition hover:bg-lime-400 disabled:opacity-60"
          >
            {loading ? "Запазване..." : "Запази новата парола"}
          </button>
        </form>
      </section>
    </PublicShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}