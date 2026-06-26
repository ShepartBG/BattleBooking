"use client";

import { useEffect, useState } from "react";
import PublicShell from "@/components/public/PublicShell";
import GameCard from "@/components/public/GameCard";
import { supabase } from "@/lib/supabase";
import { useFieldSettings } from "@/lib/useFieldSettings";
import { isGameStillPublic } from "@/lib/gameVisibility";

type Game = {
  id: string;
  title: string;
  game_date: string;
  game_time: string;
  location: string;
  max_rental_sets: number;
  status: string;
};

export default function GamesPage() {
  const fieldSettings = useFieldSettings();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGames() {
      setLoading(true);
      const { data } = await supabase
        .from("games")
        .select("id,title,game_date,game_time,location,max_rental_sets,status")
        .in("status", ["active", "postponed"])
        .gte("game_date", new Date().toISOString().slice(0, 10))
        .order("game_date", { ascending: true });

      setGames((data || []).filter(isGameStillPublic));
      setLoading(false);
    }

    loadGames();
  }, []);

  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="rounded-[2.4rem] border border-white/10 bg-black/60 p-8 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
            Live calendar
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-tight md:text-7xl">
            Активни игри
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
            Всички отворени игри, които могат да се споделят с линк и да приемат
            регистрации в BattleBooking.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full rounded-[2rem] border border-white/10 bg-black/60 p-8 text-center text-[#b7ef16] backdrop-blur-xl">
              Зареждане на активни игри...
            </div>
          ) : games.length > 0 ? (
            games.map((game) => (
              <GameCard
                key={game.id}
                id={game.id}
                title={game.title}
                date={game.game_date}
                time={game.game_time}
                location={game.location}
                maxRentalSets={game.max_rental_sets}
                status={game.status}
                fieldName={fieldSettings.name}
                fieldLogo={fieldSettings.logoUrl}
                logoFit={fieldSettings.logoFit}
            logoScale={fieldSettings.logoScale}
            logoX={fieldSettings.logoX}
            logoY={fieldSettings.logoY}
              />
            ))
          ) : (
            <div className="col-span-full rounded-[2rem] border border-white/10 bg-black/60 p-8 text-center text-zinc-400 backdrop-blur-xl">
              В момента няма активни игри.
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
