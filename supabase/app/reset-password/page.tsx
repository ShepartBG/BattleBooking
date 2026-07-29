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
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  useEffect(() => {
    async function prepareSession() {
      setError("");
      setMessage("Проверявам линка...");

      const errorCode = searchParams.get("error_code");
      const errorDescription = searchParams.get("error_description");

      if (errorCode || errorDescription) {
        setMessage("");
        setError("Линкът е невалиден или вече е използван. Заяви нов линк от 'Забравена парола'.");
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage("");
          setError("Линкът е изтекъл или невалиден. Заяви нов линк от 'Забравена парола'.");
          return;
        }

        setLinkReady(true);
        setMessage("");
        return;
      }

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type") || "recovery";
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "recovery" | "invite" | "email",
        });

        if (error) {
          setMessage("");
          setError("Линкът е изтекъл или невалиден. Заяви нов линк от 'Забравена парола'.");
          return;
        }

        setLinkReady(true);
        setMessage("");
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
      const hashError = hashParams.get("error") || hashParams.get("error_code");
      if (hashError) {
        setMessage("");
        setError("Линкът е невалиден или вече е използван. Заяви нов линк от 'Забравена парола'.");
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setMessage("");
          setError("Линкът е изтекъл или невалиден. Заяви нов линк от 'Забравена парола'.");
          return;
        }

        setLinkReady(true);
        setMessage("");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setLinkReady(true);
        setMessage("");
        return;
      }

      setMessage("");
      setError("Няма активен линк за смяна на парола. Отвори линка от email-а или заяви нов от 'Забравена парола'.");
    }

    prepareSession();
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!linkReady) {
      setError("Линкът още не е потвърден. Отвори email-а отново или заяви нов линк.");
      return;
    }

    if (password.length < 6) {
      setError("Новата парола трябва да бъде поне 6 символа.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Двете пароли не съвпадат.");
      return;
    }

    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setLoading(false);
      setError("Сесията от линка не е активна. Отвори последния email линк отново.");
      return;
    }

    const response = await fetch("/api/auth/update-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password }),
    });

    const result = await response.json().catch(() => null);

    setLoading(false);

    if (!response.ok || !result?.ok) {
      setError(result?.message || "Не успях да сменя паролата. Заяви нов линк и пробвай пак.");
      return;
    }

    await supabase.auth.signOut();
    setMessage("Паролата е сменена успешно. Прехвърлям те към вход...");
    setTimeout(() => router.replace("/login"), 1000);
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
            <div className="relative">
              <input
                className="bb-input pr-24"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={!linkReady || loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-zinc-300 hover:bg-white/[0.1] hover:text-white"
              >
                {showPassword ? "Скрий" : "Покажи"}
              </button>
            </div>
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Повтори паролата
            </span>
            <div className="relative">
              <input
                className="bb-input pr-24"
                type={showRepeatPassword ? "text" : "password"}
                value={repeatPassword}
                onChange={(event) => setRepeatPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={!linkReady || loading}
              />
              <button
                type="button"
                onClick={() => setShowRepeatPassword((current) => !current)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-zinc-300 hover:bg-white/[0.1] hover:text-white"
              >
                {showRepeatPassword ? "Скрий" : "Покажи"}
              </button>
            </div>
          </label>

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
