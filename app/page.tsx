"use client";

import { useEffect, useState } from "react";
import PublicShell from "@/components/public/PublicShell";
import FieldCard from "@/components/public/FieldCard";
import GameCard from "@/components/public/GameCard";
import BattleBookingLogo from "@/components/brand/BattleBookingLogo";
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

type PublicField = {
  id: string;
  field_name: string;
  city: string | null;
  message: string | null;
  status: string;
};

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "field";
}

function buildFieldDescription(field: PublicField) {
  return (
    field.message?.trim() ||
    "Активно игрище в BattleBooking. Виж активните игри и се запиши онлайн."
  );
}

export default function HomePage() {
  const fieldSettings = useFieldSettings();
  const [games, setGames] = useState<Game[]>([]);
  const [fields, setFields] = useState<PublicField[]>([]);

  useEffect(() => {
    async function loadData() {
      const [gamesResult, fieldsResult] = await Promise.all([
        supabase
          .from("games")
          .select("id,title,game_date,game_time,location,max_rental_sets,status")
          .in("status", ["active", "postponed"])
          .gte("game_date", new Date().toISOString().slice(0, 10))
          .order("game_date", { ascending: true })
          .limit(12),
        supabase
          .from("field_requests")
          .select("id,field_name,city,message,status")
          .eq("status", "active")
          .order("field_name", { ascending: true })
          .limit(3),
      ]);

      setGames((gamesResult.data || []).filter(isGameStillPublic).slice(0, 3));
      setFields((fieldsResult.data || []) as PublicField[]);
    }

    loadData();
  }, []);

  return (
    <PublicShell>
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-3 py-7 sm:px-4 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
        <div>
          <p className="w-fit rounded-full border border-[#95c900]/35 bg-[#95c900]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.30em] text-[#b7ef16]">
            BattleBooking
          </p>

          <h1 className="mt-5 max-w-4xl text-[2.65rem] font-black uppercase leading-[0.90] tracking-tight text-white sm:text-5xl md:text-7xl">
            По-лесно записване за airsoft игри.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
            BattleBooking помага на организаторите да създават игри, да събират
            записвания, да следят свободните комплекти под наем и да управляват
            участниците от едно място.
          </p>

          <div className="mt-7 grid gap-3 sm:flex sm:flex-row">
            <a
              href="/games"
              className="min-h-12 rounded-2xl bg-[#95c900] px-6 py-4 text-center font-black text-black shadow-[0_0_35px_rgba(149,201,0,0.25)] transition hover:bg-[#b7ef16]"
            >
              Намери игра
            </a>
            <a
              href="/register-field"
              className="min-h-12 rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-center font-black text-white transition hover:bg-white/[0.11]"
            >
              Заяви достъп за игрище
            </a>
          </div>

          <div className="mt-7 grid max-w-2xl grid-cols-1 gap-3 min-[420px]:grid-cols-3">
            <HeroStat value={String(games.length)} label="активни игри" />
            <HeroStat value={String(fields.length)} label="активни игрища" />
            <HeroStat value="Warzone" label="първо игрище" />
          </div>
        </div>

        <div className="hidden rounded-[1.75rem] border border-[#95c900]/25 bg-black/65 p-4 backdrop-blur-xl shadow-[0_0_90px_rgba(0,0,0,0.58)] sm:rounded-[2.4rem] sm:p-6 lg:block">
          <div className="flex flex-col items-center rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(149,201,0,0.18),transparent_38%),rgba(255,255,255,0.03)] p-5 sm:rounded-[2rem] sm:p-8 text-center">
            <BattleBookingLogo variant="hero" compact />
            <h2 className="mt-5 text-3xl font-black uppercase tracking-tight sm:mt-6 sm:text-4xl">
              Battle<span className="text-[#b7ef16]">Booking</span>
            </h2>
            <p className="mt-3 max-w-md text-sm font-bold uppercase tracking-[0.22em] text-zinc-500">
              Система за airsoft игри
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <MiniPanel label="Активни игри" value={String(games.length)} />
            <MiniPanel label="Активни игрища" value={String(fields.length)} />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-3 pb-10 sm:px-4 sm:pb-12">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature
            title="За организатори"
            text="Създаваш игра, пращаш линк и следиш играчи, наеми, правила и статус."
          />
          <Feature
            title="За играчи"
            text="Виждаш активните игри и се записваш бързо, без излишни чатове и анкети."
          />
          <Feature
            title="За игрища"
            text="По-ясна организация, по-малко ръчно броене и по-удобен процес за всички."
          />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-3 pb-10 sm:px-4 sm:pb-12">
        <div className="overflow-hidden rounded-[1.75rem] border border-[#95c900]/30 bg-[radial-gradient(circle_at_top_left,rgba(149,201,0,0.22),transparent_34%),rgba(0,0,0,0.68)] p-5 sm:rounded-[2.4rem] sm:p-7 backdrop-blur-xl md:p-9">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
                BattleBooking за организатори
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
                Управление на игри от едно място
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-zinc-300">
                Подходящо за игрища, които искат по-подредено записване,
                контрол на наемната екипировка и лесен списък с участници.
              </p>
              <a
                href="/register-field"
                className="mt-6 inline-flex min-h-12 rounded-2xl bg-[#95c900] px-6 py-4 text-center font-black text-black transition hover:bg-[#b7ef16]"
              >
                Заяви достъп
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PlanItem text="Създаване на игри" />
              <PlanItem text="Онлайн записвания" />
              <PlanItem text="Admin панел" />
              <PlanItem text="Отделен линк за игра" />
              <PlanItem text="Rental / own статистики" />
              <PlanItem text="Списък с участници" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-3 pb-10 sm:px-4 sm:pb-12">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
              BattleBooking
            </p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Активни игрища</h2>
          </div>
          <a
            href="/fields"
            className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-center font-black text-[#b7ef16] hover:text-white md:border-0 md:bg-transparent md:px-0"
          >
            Виж всички →
          </a>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {fields.length > 0 ? (
            fields.map((field) => (
              <FieldCard
                key={field.id}
                name={field.field_name}
                location={field.city?.trim() || "България"}
                description={buildFieldDescription(field)}
                href={`/field/${createSlug(field.field_name)}`}
                image="/warzone-bg.jpg"
                logo="/warzone-logo.png"
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

      <section className="mx-auto w-full max-w-7xl px-3 pb-14 sm:px-4 sm:pb-16">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#b7ef16]">
              Live Games
            </p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Активни игри</h2>
          </div>
          <a
            href="/games"
            className="min-h-11 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-center font-black text-[#b7ef16] hover:text-white md:border-0 md:bg-transparent md:px-0"
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
    <div className="rounded-[1.75rem] border border-white/10 bg-black/60 p-5 sm:rounded-[2rem] sm:p-6 backdrop-blur-xl transition hover:border-[#95c900]/35">
      <h3 className="text-2xl font-black text-[#b7ef16]">{title}</h3>
      <p className="mt-3 leading-7 text-zinc-300">{text}</p>
    </div>
  );
}
