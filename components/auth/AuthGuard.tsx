"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthState = "checking" | "allowed" | "blocked";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>("checking");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session) {
        setState("allowed");
        return;
      }

      setState("blocked");
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        setState("allowed");
      } else {
        setState("blocked");
        router.replace("/login");
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (state !== "allowed") {
    return (
      <main className="min-h-screen bb-page-bg text-white">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4">
          <div className="w-full rounded-[2rem] border border-lime-400/15 bg-black/70 p-8 text-center backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-lime-300">
              BattleBooking Security
            </p>
            <h1 className="mt-3 text-3xl font-black">Проверявам достъпа...</h1>
            <p className="mt-3 text-zinc-400">
              Ако не си влязъл в акаунта си, ще те прехвърля към вход.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
