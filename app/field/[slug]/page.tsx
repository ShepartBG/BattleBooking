"use client";

import { useEffect, useState } from "react";
import PublicShell from "@/components/public/PublicShell";
import GameCard from "@/components/public/GameCard";
import { supabase } from "@/lib/supabase";
import FieldLogoFrame from "@/components/brand/FieldLogoFrame";
import { useFieldSettings } from "@/lib/useFieldSettings";

type Game = {
  id: string;
  title: string;
  game_date: string;
  game_time: string;
  location: string;
  max_rental_sets: number;
  status: string;
};

export default function FieldPage() {
  const [games, setGames] = useState<Game[]>([]);
  const fieldSettings = useFieldSettings();

  useEffect(() => {
    async function loadGames() {
      const { data } = await supabase
        .from("games")
        .select("id,title,game_date,game_time,location,max_rental_sets,status")
        .eq("status", "active")
        .order("game_date", { ascending: true })
        .limit(6);

      setGames(data || []);
    }

    loadGames();
  }, []);

  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="overflow-hidden rounded-[2.6rem] border border-[#95c900]/22 bg-black/60 backdrop-blur-xl">
          <div
            className="relative min-h-[360px] bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.88),rgba(0,0,0,.45),rgba(0,0,0,.78)), url('${fieldSettings.backgroundUrl}')`,
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(149,201,0,.22),transparent_38%)]" />

            <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-6 md:p-10">
              <FieldLogoFrame
                src={fieldSettings.logoUrl}
                alt={fieldSettings.name}
                size="lg"
                fit={fieldSettings.logoFit}
                scale={fieldSettings.logoScale}
                x={fieldSettings.logoX}
                y={fieldSettings.logoY}
                className="mb-6"
              />

              <p className="w-fit rounded-full border border-[#95c900]/35 bg-[#95c900]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#b7ef16]">
                Verified field
              </p>

              <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.94] tracking-tight md:text-7xl">
                {fieldSettings.name}
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
                {fieldSettings.description}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
            <h2 className="text-3xl font-black">Информация</h2>
            <div className="mt-5 space-y-3 text-zinc-300">
              <Info label="Локация" value={`📍 ${fieldSettings.location}`} />
              <Info
                label="Стандартна цена"
                value={`${fieldSettings.ownPrice} със собствено оборудване`}
              />
              <Info
                label="Под наем"
                value={`${fieldSettings.rentalPrice} с комплект под наем`}
              />
              <Info label="Статус" value="🟢 Активно игрище" />
              {fieldSettings.phone && (
                <Info label="Телефон" value={`☎ ${fieldSettings.phone}`} />
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Social href={fieldSettings.facebook} label="Facebook" icon="ⓕ" />
              <Social href={fieldSettings.instagram} label="Instagram" icon="◎" />
              <Social href={fieldSettings.tiktok} label="TikTok" icon="♪" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
            <h2 className="text-3xl font-black">Следващи игри</h2>
            <div className="mt-5 grid gap-4">
              {games.length > 0 ? (
                games
                  .slice(0, 2)
                  .map((game) => (
                    <GameCard
                      key={game.id}
                      id={game.id}
                      title={game.title}
                      date={game.game_date}
                      time={game.game_time}
                      location={game.location}
                      maxRentalSets={game.max_rental_sets}
                      fieldName={fieldSettings.name}
                      fieldLogo={fieldSettings.logoUrl}
                      logoFit={fieldSettings.logoFit}
            logoScale={fieldSettings.logoScale}
            logoX={fieldSettings.logoX}
            logoY={fieldSettings.logoY}
                    />
                  ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-zinc-400">
                  В момента няма активни игри за това игрище.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}

function Social({ href, label, icon }: { href: string; label: string; icon: string }) {
  if (!href) return null;
  return (
    <a
      href={normalizeUrl(href)}
      target="_blank"
      className="inline-flex items-center gap-2 rounded-full border border-lime-400/25 bg-lime-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-lime-300 hover:bg-lime-400 hover:text-black"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-sm normal-case">
        {icon}
      </span>
      {label}
    </a>
  );
}

function normalizeUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}
