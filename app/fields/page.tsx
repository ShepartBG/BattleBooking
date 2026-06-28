"use client";

import { useEffect, useState } from "react";
import PublicShell from "@/components/public/PublicShell";
import FieldCard from "@/components/public/FieldCard";

type PublicField = {
  id: string;
  name: string;
  slug: string;
  settlement: string;
  location: string;
  description: string;
  backgroundUrl: string;
  logoUrl: string;
  logoFit: "contain" | "cover";
  logoScale: number;
  logoX: number;
  logoY: number;
};

export default function FieldsPage() {
  const [fields, setFields] = useState<PublicField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFields() {
      setLoading(true);

      try {
        const response = await fetch(`/api/public-fields?t=${Date.now()}`, {
          cache: "no-store",
        });
        const result = await response.json();

        if (!response.ok || !result.ok) {
          console.error("Public fields load error:", result.message);
          setFields([]);
          return;
        }

        setFields(result.fields || []);
      } catch (error) {
        console.error("Public fields load error:", error);
        setFields([]);
      } finally {
        setLoading(false);
      }
    }

    loadFields();
  }, []);

  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="rounded-[2.4rem] border border-white/10 bg-black/60 p-8 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
            BattleBooking
          </p>

          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">
            Игрища
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            Активни игрища, които използват BattleBooking за записвания и
            управление на игри.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full rounded-[2rem] border border-white/10 bg-black/60 p-8 text-center text-zinc-400 backdrop-blur-xl">
              Зареждане на игрищата...
            </div>
          ) : fields.length > 0 ? (
            fields.map((field) => (
              <FieldCard
                key={field.id}
                name={field.name}
                location={field.settlement || field.location || "България"}
                description={field.description}
                href={`/field/${field.slug}`}
                image={field.backgroundUrl}
                logo={field.logoUrl}
                logoFit={field.logoFit}
                logoScale={field.logoScale}
                logoX={field.logoX}
                logoY={field.logoY}
                status="Активно"
              />
            ))
          ) : (
            <div className="col-span-full rounded-[2rem] border border-white/10 bg-black/60 p-8 text-center text-zinc-400 backdrop-blur-xl">
              В момента няма активни игрища за показване.
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
