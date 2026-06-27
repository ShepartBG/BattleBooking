"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PublicShell from "@/components/public/PublicShell";
import BattleBookingLogo from "@/components/brand/BattleBookingLogo";
import { supabase } from "@/lib/supabase";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = useMemo(() => searchParams.get("next") || "/admin", [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(nextUrl);
    });
  }, [nextUrl, router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isValidEmail(email)) {
      setError("Моля, въведете валиден имейл.");
      return;
    }

    if (password.length < 6) {
      setError("Паролата трябва да бъде поне 6 символа.");
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (loginError) {
      setLoading(false);
      setError("Грешен имейл или парола. Провери данните и опитай пак.");
      return;
    }

    const accessResult = await checkLoginAccess(normalizedEmail);
    setLoading(false);

    if (!accessResult.allowed) {
      await supabase.auth.signOut();
      setError(accessResult.message);
      return;
    }

    setMessage("Успешен вход. Прехвърлям те към admin панела...");
    router.replace(nextUrl);
  }

  return (
    <PublicShell>
      <section className="mx-auto grid min-h-[calc(100vh-180px)] max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[1fr_0.95fr]">
        <div>
          <BattleBookingLogo variant="hero" showText={false} />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.35em] text-lime-300">
            Organizer Login
          </p>
          <h1 className="mt-4 text-5xl font-black leading-none md:text-7xl">
            Вход в BattleBooking
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
            Влез в админ панела на своето игрище, създавай игри, управлявай регистрации и настройвай профила си.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-[2rem] border border-lime-400/15 bg-black/70 p-6 shadow-[0_0_70px_rgba(0,0,0,.45)] backdrop-blur-xl"
          noValidate
        >
          <h2 className="text-3xl font-black">Добре дошъл обратно</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Въведи имейл и парола за достъп до admin панела.
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

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Парола
            </span>
            <div className="relative">
              <input
                className="bb-input pr-24"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
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
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-lime-500 px-5 py-4 font-black text-black transition hover:bg-lime-400 disabled:opacity-60"
          >
            {loading ? "Влизане..." : "Вход"}
          </button>

          <div className="mt-5 flex flex-col gap-3 text-sm font-bold text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
            <a href="/forgot-password" className="text-lime-300 hover:text-lime-100">
              Забравена парола?
            </a>
            <a href="/register-field" className="hover:text-white">
              Нямаш акаунт? Заяви достъп
            </a>
          </div>
        </form>
      </section>
    </PublicShell>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={
      <PublicShell>
        <section className="mx-auto flex min-h-[calc(100vh-180px)] max-w-3xl items-center px-4 py-10">
          <div className="w-full rounded-[2rem] border border-lime-400/15 bg-black/70 p-6 text-center backdrop-blur-xl">
            <p className="text-lime-300 font-black">Зареждане...</p>
          </div>
        </section>
      </PublicShell>
    }>
      <LoginContent />
    </Suspense>
  );
}


async function checkLoginAccess(email: string) {
  const ownerEmails = (process.env.NEXT_PUBLIC_OWNER_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (ownerEmails.includes(email)) {
    return { allowed: true, message: "" };
  }

  const { data, error } = await supabase
    .from("field_requests")
    .select("status,access_status,subscription_valid_until,grace_until,access_blocked_reason")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      allowed: false,
      message: "Няма активен BattleBooking достъп за този email. Ако смяташ, че има грешка, свържи се с BattleBooking.",
    };
  }

  const status = String(data.access_status || data.status || "");

  if (status === "suspended") {
    return {
      allowed: false,
      message:
        data.access_blocked_reason ||
        "Достъпът Ви е временно ограничен. За повече информация се свържете с BattleBooking.",
    };
  }

  if (status !== "active") {
    return {
      allowed: false,
      message: "Акаунтът Ви все още не е активиран. Моля, изчакайте одобрение от BattleBooking.",
    };
  }

  if (data.grace_until) {
    const today = new Date().toISOString().slice(0, 10);
    if (today > String(data.grace_until)) {
      return {
        allowed: false,
        message:
          "Достъпът Ви е временно ограничен. За повече информация се свържете с BattleBooking.",
      };
    }
  }

  return { allowed: true, message: "" };
}
