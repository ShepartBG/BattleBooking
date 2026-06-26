"use client";

import { ReactNode, useState } from "react";
import PublicNav from "@/components/public/PublicNav";
import BattleBookingLogo from "@/components/brand/BattleBookingLogo";
import AuthGuard from "@/components/auth/AuthGuard";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Props = {
  active: "games" | "new-game" | "settings" | "requests";
  children: ReactNode;
};

const adminLinks = [
  { key: "games", href: "/admin", label: "Игри" },
  { key: "new-game", href: "/admin/new-game", label: "Нова игра" },
  { key: "requests", href: "/admin/requests", label: "Requests" },
  { key: "settings", href: "/admin/settings", label: "Settings" },
] as const;

export default function AdminShell({ active, children }: Props) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bb-page-bg text-white">
        <PublicNav />
        <div className="mx-auto grid max-w-7xl gap-5 p-4 md:p-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-5 backdrop-blur-xl lg:sticky lg:top-24 lg:h-[calc(100vh-112px)]">
            <BattleBookingLogo variant="mark" showText={false} />
            <h1 className="mt-6 text-3xl font-black">Admin</h1>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Управление на игри, заявки, настройки, branding и бъдещ SaaS профил.
            </p>

            <nav className="mt-8 space-y-2 text-sm font-bold text-zinc-300">
              {adminLinks.map((link) => (
                <a
                  key={link.key}
                  className={`block rounded-2xl px-4 py-3 transition ${
                    active === link.key
                      ? "bg-lime-400/10 text-lime-300"
                      : "hover:bg-white/[0.05]"
                  }`}
                  href={link.href}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <button
              onClick={signOut}
              disabled={isSigningOut}
              className="mt-6 w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500 hover:text-white disabled:opacity-60"
            >
              {isSigningOut ? "Излизане..." : "Изход"}
            </button>
          </aside>

          {children}
        </div>
      </main>
    </AuthGuard>
  );
}
