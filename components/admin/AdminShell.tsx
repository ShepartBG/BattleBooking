"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import PublicNav from "@/components/public/PublicNav";
import BattleBookingLogo from "@/components/brand/BattleBookingLogo";
import AuthGuard from "@/components/auth/AuthGuard";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { isOwnerEmail } from "@/lib/access";

type Props = {
  active: "games" | "new-game" | "calendar" | "stats" | "settings" | "requests" | "fields" | "gallery" | "shops" | "events";
  children: ReactNode;
};

const adminLinks = [
  { key: "games", href: "/admin", label: "Игри" },
  { key: "new-game", href: "/admin/new-game", label: "Нова игра" },
  { key: "calendar", href: "/admin/calendar", label: "Календар" },
  { key: "stats", href: "/admin/stats", label: "Статистика" },
  { key: "fields", href: "/admin/fields", label: "Игрища" },
  { key: "gallery", href: "/admin/gallery", label: "Галерия" },
  { key: "requests", href: "/admin/requests", label: "Заявки" },
  { key: "shops", href: "/admin/shops", label: "Магазини" },
  { key: "events", href: "/admin/events", label: "Събития" },
  { key: "settings", href: "/admin/settings", label: "Настройки" },
] as const;

export default function AdminShell({ active, children }: Props) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadRole() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setIsOwner(isOwnerEmail(data.user?.email || ""));
    }

    loadRole();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleAdminLinks = useMemo(
    () => adminLinks.filter((link) => !["requests", "shops", "events"].includes(link.key) || isOwner),
    [isOwner],
  );

  async function signOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bb-page-bg pb-24 text-white lg:pb-0">
        <PublicNav />
        <div className="mx-auto grid max-w-7xl gap-4 p-3 sm:p-4 md:p-6 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-[1.75rem] border border-lime-400/15 bg-black/65 p-4 backdrop-blur-xl sm:rounded-[2rem] sm:p-5 lg:sticky lg:top-24 lg:h-[calc(100vh-112px)]">
            <div className="flex items-center gap-3 lg:block">
              <BattleBookingLogo variant="mark" showText={false} />
              <div>
                <h1 className="text-2xl font-black lg:mt-6 lg:text-3xl">
                  Контролен панел
                </h1>
                <p className="mt-1 text-xs leading-5 text-zinc-500 lg:mt-2">
                  Управление на игри, записвания и профил.
                </p>
              </div>
            </div>

            <nav className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-zinc-300 sm:grid-cols-6 lg:mt-8 lg:block lg:space-y-2">
              {visibleAdminLinks.map((link) => (
                <a
                  key={link.key}
                  className={`flex min-h-12 items-center justify-center rounded-2xl px-3 py-3 text-center transition lg:block lg:text-left ${
                    active === link.key
                      ? "bg-lime-400/10 text-lime-300"
                      : "bg-white/[0.035] hover:bg-white/[0.07]"
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
              className="mt-4 hidden w-full rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition hover:bg-red-500 hover:text-white disabled:opacity-60 lg:block"
            >
              {isSigningOut ? "Излизане..." : "Изход"}
            </button>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/86 px-2 py-2 backdrop-blur-2xl lg:hidden">
          <div className="bb-mobile-admin-nav mx-auto flex max-w-xl gap-2 overflow-x-auto pb-1 text-[11px] font-black text-zinc-300">
            {visibleAdminLinks.map((link) => (
              <a
                key={link.key}
                href={link.href}
                className={`flex min-h-12 min-w-[82px] shrink-0 items-center justify-center rounded-2xl px-2 py-2 text-center leading-tight ${
                  active === link.key
                    ? "bg-lime-400 text-black"
                    : "bg-white/[0.07] text-white"
                }`}
              >
                <span className="max-w-full break-words">{link.label}</span>
              </a>
            ))}
          </div>
        </nav>
      </main>
    </AuthGuard>
  );
}
