"use client";

import { useEffect, useState } from "react";
import PublicShell from "@/components/public/PublicShell";
import FieldCard from "@/components/public/FieldCard";
import { supabase } from "@/lib/supabase";
import { createFieldSlug, rowToFieldSettings } from "@/lib/fieldSettings";
import type { FieldSettingsRow } from "@/lib/fieldSettings";

type PublicField = FieldSettingsRow & {
  id: string;
  field_name: string;
  city: string | null;
  message: string | null;
  status: string;
};

export default function FieldsPage() {
  const [fields, setFields] = useState<PublicField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFields() {
      setLoading(true);

      const { data, error } = await supabase
        .from("field_requests")
        .select(
          "id,field_name,city,message,facebook,instagram,tiktok,status,public_slug,public_region,public_settlement,public_location,public_description,logo_url,logo_fit,logo_scale,logo_x,logo_y,background_url,own_price,rental_price,contact_phone,phone",
        )
        .eq("status", "active")
        .order("field_name", { ascending: true });

      setLoading(false);

      if (error) {
        console.error("Fields load error:", error.message);
        setFields([]);
        return;
      }

      setFields((data || []) as PublicField[]);
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
            fields.map((field) => {
              const settings = rowToFieldSettings(field);
              const slug = settings.slug || createFieldSlug(settings.name);

              return (
                <FieldCard
                  key={field.id}
                  name={settings.name}
                  location={settings.settlement || settings.location || "България"}
                  description={settings.description}
                  href={`/field/${slug}`}
                  image={settings.backgroundUrl}
                  logo={settings.logoUrl}
                  logoFit={settings.logoFit}
                  logoScale={settings.logoScale}
                  logoX={settings.logoX}
                  logoY={settings.logoY}
                  status="Активно"
                />
              );
            })
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
