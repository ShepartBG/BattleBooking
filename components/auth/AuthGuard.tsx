"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthState = "checking" | "allowed" | "blocked";

function isOwner(email: string) {
  const ownerEmails = (process.env.NEXT_PUBLIC_OWNER_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return ownerEmails.includes(email.trim().toLowerCase());
}

async function checkOrganizerAccess(email: string) {
  if (isOwner(email)) return { allowed: true, message: "" };

  const { data, error } = await supabase
    .from("field_requests")
    .select("status,access_status,grace_until,access_blocked_reason")
    .eq("email", email.trim().toLowerCase())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      allowed: false,
      message: "Няма активен BattleBooking достъп за този email.",
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
      message: "Акаунтът Ви все още не е активиран.",
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

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>("checking");
  const [blockedMessage, setBlockedMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const email = data.session?.user?.email || "";

      if (!data.session || !email) {
        setState("blocked");
        const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
        router.replace(`/login${next}`);
        return;
      }

      const access = await checkOrganizerAccess(email);
      if (!mounted) return;

      if (access.allowed) {
        setState("allowed");
        return;
      }

      await supabase.auth.signOut();
      setBlockedMessage(access.message);
      setState("blocked");
    }

    checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (!session) {
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
              {blockedMessage || "Ако не си влязъл в акаунта си, ще те прехвърля към вход."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
