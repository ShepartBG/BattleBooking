"use client";

import { useEffect, useState } from "react";
import PublicShell from "@/components/public/PublicShell";
import FieldCard from "@/components/public/FieldCard";
import GameCard from "@/components/public/GameCard";
import BattleBookingLogo from "@/components/brand/BattleBookingLogo";
import { supabase } from "@/lib/supabase";
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

export default function HomePage() {
  const fieldSettings = useFieldSettings();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    async function loadGames() {
      const { data } = await supabase
        .from("games")
        .select("id,title,game_date,game_time,location,max_rental_sets,status")
        .eq("status", "active")
        .order("game_date", { ascending: true })
        .limit(3);

      setGames(data || []);
    }

    loadGames();
  }, []);

  return (
    <PublicShell>
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
        <div>
          <p className="w-fit rounded-full border border-[#95c900]/35 bg-[#95c900]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.30em] text-[#b7ef16]">
            BattleBooking V6.3 Platform Shell
          </p>

          <h1 className="mt-6 max-w-4xl text-5xl font-black uppercase leading-[0.92] tracking-tight text-white md:text-7xl">
            Booking platform за airsoft игрища.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            BattleBooking събира игрища, активни игри, записвания, правила,
            комплекти под наем и admin управление в една професионална SaaS
            платформа. Целта е проста: по-малко хаос в чатове, повече реални
            играчи на терена.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/games"
              className="rounded-2xl bg-[#95c900] px-6 py-4 text-center font-black text-black shadow-[0_0_35px_rgba(149,201,0,0.25)] transition hover:bg-[#b7ef16]"
            >
              Намери игра
            </a>
            <a
              href="/register-field"
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-center font-black text-white transition hover:bg-white/[0.11]"
            >
              Заяви достъп за игрище
            </a>
          </div>

          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            <HeroStat value="Field" label="профили" />
            <HeroStat value="Live" label="регистрации" />
            <HeroStat value="QR" label="следващ модул" />
          </div>
        </div>

        <div className="rounded-[2.4rem] border border-[#95c900]/25 bg-black/65 p-6 backdrop-blur-xl shadow-[0_0_90px_rgba(0,0,0,0.58)]">
          <div className="flex flex-col items-center rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(149,201,0,0.18),transparent_38%),rgba(255,255,255,0.03)] p-8 text-center">
            <BattleBookingLogo variant="hero" compact />
            <h2 className="mt-6 text-4xl font-black uppercase tracking-tight">
              Battle<span className="text-[#b7ef16]">Booking</span>
            </h2>
            <p className="mt-3 max-w-md text-sm font-bold uppercase tracking-[0.22em] text-zinc-500">
              Airsoft SaaS / Marketplace / Dashboard
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <MiniPanel label="Следващи игри" value={String(games.length)} />
            <MiniPanel label="Първо игрище" value="Warzone" />
            <MiniPanel label="Абонамент" value="55 €" />
            <MiniPanel label="Статус" value="Online" />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature
            title="За организатори"
            text="Създаваш игра, пращаш линк, следиш играчи, наеми, правила и статус."
          />
          <Feature
            title="За играчи"
            text="Виждат активните игри и се записват бързо, без излишни чатове и анкети."
          />
          <Feature
            title="За бъдещия SaaS"
            text="Free trial, pending approval, active subscription, профили и analytics."
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12">
        <div className="overflow-hidden rounded-[2.4rem] border border-[#95c900]/30 bg-[radial-gradient(circle_at_top_left,rgba(149,201,0,0.22),transparent_34%),rgba(0,0,0,0.68)] p-7 backdrop-blur-xl md:p-9">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
                BattleBooking Organizer
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                55 € / месец
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-zinc-300">
                Месечен абонамент за игрища, които искат професионално управление на игри, регистрации, играчи и бъдещи известия.
              </p>
              <a
                href="/register-field"
                className="mt-6 inline-flex rounded-2xl bg-[#95c900] px-6 py-4 text-center font-black text-black transition hover:bg-[#b7ef16]"
              >
                Заяви достъп
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PlanItem text="Неограничен брой игри" />
              <PlanItem text="Неограничени регистрации" />
              <PlanItem text="Admin dashboard" />
              <PlanItem text="Игри с отделен линк" />
              <PlanItem text="Rental / own статистики" />
              <PlanItem text="Бъдещи email обновления" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
              Marketplace
            </p>
            <h2 className="mt-2 text-4xl font-black">Регистрирани игрища</h2>
          </div>
          <a
            href="/fields"
            className="font-black text-[#b7ef16] hover:text-white"
          >
            Виж всички →
          </a>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <FieldCard
            name={fieldSettings.name}
            location={fieldSettings.location}
            description={fieldSettings.description}
            href={`/field/${fieldSettings.slug || "warzone"}`}
            image={fieldSettings.backgroundUrl}
            logo={fieldSettings.logoUrl}
            logoFit={fieldSettings.logoFit}
            logoScale={fieldSettings.logoScale}
            logoX={fieldSettings.logoX}
            logoY={fieldSettings.logoY}
          />
          <FieldCard
            name="Tactical Arena"
            location="Очаква регистрация"
            description="Примерна карта за бъдещи партньорски игрища в BattleBooking marketplace."
            href="/register-field"
            status="Очаква одобрение"
            logo="/battlebooking-mark.png"
          />
          <FieldCard
            name="Black Ops Field"
            location="Очаква регистрация"
            description="Тук ще се показват реални игрища, след като бъдат добавени към платформата."
            href="/register-field"
            status="Очаква одобрение"
            logo="/battlebooking-mark.png"
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
              Live Games
            </p>
            <h2 className="mt-2 text-4xl font-black">Активни игри</h2>
          </div>
          <a
            href="/games"
            className="font-black text-[#b7ef16] hover:text-white"
          >
            Всички игри →
          </a>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {games.length > 0 ? (
            games.map((game) => (
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
            <div className="col-span-full rounded-[2rem] border border-white/10 bg-black/60 p-8 text-center text-zinc-400 backdrop-blur-xl">
              В момента няма заредени активни игри за показване.
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-xl">
      <p className="text-2xl font-black text-[#b7ef16]">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function MiniPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/55 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function PlanItem({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/45 p-4 text-sm font-bold text-zinc-200">
      <span className="text-[#b7ef16]">✓</span> {text}
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/60 p-6 backdrop-blur-xl transition hover:border-[#95c900]/35">
      <h3 className="text-2xl font-black text-[#b7ef16]">{title}</h3>
      <p className="mt-3 leading-7 text-zinc-300">{text}</p>
    </div>
  );
}
