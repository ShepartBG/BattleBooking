"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BattleBookingLogo from "@/components/brand/BattleBookingLogo";
import { supabase } from "@/lib/supabase";
import { isOwnerEmail } from "@/lib/access";

const navItems = [
  { href: "/fields", label: "Игрища" },
  { href: "/games", label: "Игри" },
  { href: "/about", label: "Платформа" },
  { href: "/contact", label: "Контакти" },
];

type SessionState = "checking" | "logged-out" | "logged-in";

export default function PublicNav() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [userEmail, setUserEmail] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      const email = session?.user?.email || "";
      setUserEmail(email);
      setSessionState(session ? "logged-in" : "logged-out");
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    setIsSigningOut(false);
    router.replace("/login");
    router.refresh();
  }

  const dashboardHref = isOwnerEmail(userEmail) ? "/admin" : "/admin";
  const dashboardLabel = isOwnerEmail(userEmail) ? "Admin" : "Dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/62 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3">
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

        <div className="flex items-center gap-2">
          {sessionState === "logged-in" ? (
            <>
              <a
                href={dashboardHref}
                className="rounded-2xl bg-[#95c900] px-4 py-2 text-sm font-black text-black shadow-[0_0_25px_rgba(149,201,0,0.24)] transition hover:bg-[#b7ef16]"
              >
                {dashboardLabel}
              </a>
              <button
                onClick={signOut}
                disabled={isSigningOut}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-black text-white transition hover:bg-white/[0.10] disabled:opacity-60"
              >
                {isSigningOut ? "Излизане..." : "Изход"}
              </button>
            </>
          ) : (
            <>
              <a
                href="/login"
                className="hidden rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-black text-white transition hover:bg-white/[0.10] sm:block"
              >
                Вход
              </a>
              <a
                href="/register-field"
                className="rounded-2xl bg-[#95c900] px-4 py-2 text-sm font-black text-black shadow-[0_0_25px_rgba(149,201,0,0.24)] transition hover:bg-[#b7ef16]"
              >
                Заяви достъп
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
