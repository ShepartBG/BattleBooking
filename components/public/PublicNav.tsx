"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BattleBookingLogo from "@/components/brand/BattleBookingLogo";
import { supabase } from "@/lib/supabase";
import { isOwnerEmail } from "@/lib/access";

const navItems = [
  { href: "/", label: "Начало" },
  { href: "/fields", label: "Игрища" },
  { href: "/games", label: "Игри" },
  { href: "/about", label: "Информация" },
  { href: "/contact", label: "Контакти" },
];

type SessionState = "checking" | "logged-out" | "logged-in";

export default function PublicNav() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [userEmail, setUserEmail] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const email = data.session?.user?.email || "";
      setUserEmail(email);
      setSessionState(data.session ? "logged-in" : "logged-out");
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;

        const email = session?.user?.email || "";
        setUserEmail(email);
        setSessionState(session ? "logged-in" : "logged-out");
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
    setMobileOpen(false);
    router.replace("/login");
    router.refresh();
  }

  const dashboardHref = isOwnerEmail(userEmail) ? "/admin" : "/admin";
  const dashboardLabel = isOwnerEmail(userEmail) ? "Owner панел" : "Контролен панел";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/85 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        <BattleBookingLogo />

        <nav className="hidden items-center gap-1 text-sm font-bold text-zinc-300 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              className="rounded-xl px-3 py-2 transition hover:bg-white/[0.07] hover:text-white"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {sessionState === "logged-in" ? (
            <>
              <a
                href={dashboardHref}
                className="min-h-11 rounded-2xl bg-[#95c900] px-4 py-2.5 text-sm font-black text-black shadow-[0_0_25px_rgba(149,201,0,0.24)] transition hover:bg-[#b7ef16]"
              >
                {dashboardLabel}
              </a>
              <button
                onClick={signOut}
                disabled={isSigningOut}
                className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/[0.10] disabled:opacity-60"
              >
                {isSigningOut ? "Излизане..." : "Изход"}
              </button>
            </>
          ) : (
            <>
              <a
                href="/login"
                className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/[0.10]"
              >
                Вход
              </a>
              <a
                href="/register-field"
                className="min-h-11 rounded-2xl bg-[#95c900] px-4 py-2.5 text-sm font-black text-black shadow-[0_0_25px_rgba(149,201,0,0.24)] transition hover:bg-[#b7ef16]"
              >
                Заяви достъп
              </a>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-xl font-black text-white sm:hidden"
          aria-label="Отвори меню"
        >
          {mobileOpen ? "×" : "☰"}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-black/95 px-3 pb-4 pt-2 sm:hidden">
          <div className="grid gap-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-base font-black text-zinc-200"
              >
                {item.label}
              </a>
            ))}

            {sessionState === "logged-in" ? (
              <>
                <a
                  href={dashboardHref}
                  onClick={() => setMobileOpen(false)}
                  className="min-h-12 rounded-2xl bg-[#95c900] px-4 py-3 text-center text-base font-black text-black"
                >
                  {dashboardLabel}
                </a>
                <button
                  onClick={signOut}
                  disabled={isSigningOut}
                  className="min-h-12 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-base font-black text-red-200 disabled:opacity-60"
                >
                  {isSigningOut ? "Излизане..." : "Изход"}
                </button>
              </>
            ) : (
              <>
                <a
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-base font-black text-white"
                >
                  Вход
                </a>
                <a
                  href="/register-field"
                  onClick={() => setMobileOpen(false)}
                  className="min-h-12 rounded-2xl bg-[#95c900] px-4 py-3 text-center text-base font-black text-black"
                >
                  Заяви достъп
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
