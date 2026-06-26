"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isOwnerEmail } from "@/lib/access";

type OwnerState = "checking" | "allowed" | "blocked";

export default function OwnerGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<OwnerState>("checking");
  const [email, setEmail] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkOwner() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      const userEmail = data.user?.email || "";
      setEmail(userEmail);

      if (isOwnerEmail(userEmail)) {
        setState("allowed");
        return;
      }

      setState("blocked");
    }

    checkOwner();

    return () => {
      mounted = false;
    };
  }, []);

  if (state === "checking") {
    return (
      <div className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-8 text-center backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-lime-300">
          Owner Security
        </p>
        <h2 className="mt-3 text-3xl font-black">Проверявам owner достъпа...</h2>
      </div>
    );
  }

  if (state === "blocked") {
    return (
      <div className="rounded-[2rem] border border-red-400/25 bg-black/65 p-8 text-center backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-red-300">
          Access blocked
        </p>
        <h2 className="mt-3 text-3xl font-black">Нямаш owner достъп.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
          Тази страница е само за собственика на BattleBooking. В момента си влязъл с:
          <span className="font-bold text-white"> {email || "неизвестен email"}</span>
        </p>
        <button
          onClick={() => router.replace("/admin")}
          className="mt-6 rounded-2xl bg-lime-500 px-5 py-3 font-black text-black hover:bg-lime-400"
        >
          Назад към dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
