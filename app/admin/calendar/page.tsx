"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { getCurrentFieldContext } from "@/lib/currentField";
import { useBattleBookingDialog } from "@/components/ui/useBattleBookingDialog";

type Game = {
  id: string;
  title: string;
  game_date: string;
  game_time: string;
  location: string;
  status: string;
};

const monthNames = [
  "Януари",
  "Февруари",
  "Март",
  "Април",
  "Май",
  "Юни",
  "Юли",
  "Август",
  "Септември",
  "Октомври",
  "Ноември",
  "Декември",
];

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function statusClass(status: string) {
  if (status === "active")
    return "border-lime-400/30 bg-lime-400/10 text-lime-200";
  if (status === "postponed")
    return "border-red-400/30 bg-red-500/10 text-red-200";
  return "border-zinc-400/20 bg-white/[0.04] text-zinc-300";
}

export default function AdminCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const { Dialog, bbAlert } = useBattleBookingDialog();

  async function loadGames() {
    setLoading(true);

    try {
      const context = await getCurrentFieldContext();
      const monthStart = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1,
      );
      const monthEnd = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1,
      );

      let query = supabase
        .from("games")
        .select("id,title,game_date,game_time,location,status")
        .gte("game_date", toDateKey(monthStart))
        .lt("game_date", toDateKey(monthEnd))
        .order("game_date", { ascending: true })
        .order("game_time", { ascending: true });

      if (!context.isOwner) {
        if (!context.fieldId) {
          setGames([]);
          setLoading(false);
          return;
        }
        query = query.eq("field_id", context.fieldId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      bbAlert(
        error instanceof Error
          ? error.message
          : "Грешка при зареждане на календара.",
        "Грешка",
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadGames();
  }, [currentMonth]);

  const days = useMemo(() => {
    const first = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1,
    );
    const last = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
    );
    const leadingEmptyDays = (first.getDay() + 6) % 7;
    const result: Array<Date | null> = Array.from(
      { length: leadingEmptyDays },
      () => null,
    );

    for (let day = 1; day <= last.getDate(); day += 1) {
      result.push(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
      );
    }

    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [currentMonth]);

  const gamesByDate = useMemo(() => {
    const map = new Map<string, Game[]>();
    games.forEach((game) => {
      const list = map.get(game.game_date) || [];
      list.push(game);
      map.set(game.game_date, list);
    });
    return map;
  }, [games]);

  function moveMonth(direction: number) {
    setCurrentMonth(
      (date) => new Date(date.getFullYear(), date.getMonth() + direction, 1),
    );
  }

  return (
    <AdminShell active="calendar">
      <Dialog />
      <section className="space-y-5">
        <div className="overflow-hidden rounded-[2rem] border border-lime-400/15 bg-black/65 backdrop-blur-xl">
          <div className="grid md:grid-cols-[1.35fr_0.65fr]">
            <div className="p-5 md:p-7">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                    Calendar
                  </p>
                  <h1 className="mt-2 text-4xl font-black">
                    Календар на игрите
                  </h1>
                  <p className="mt-3 text-sm text-zinc-400">
                    Бърз месечен изглед за всички игри.
                  </p>
                </div>
                <a
                  href="/admin/new-game"
                  className="rounded-2xl bg-lime-500 px-5 py-3 text-center font-black text-black hover:bg-lime-400"
                >
                  + Нова игра
                </a>
              </div>
            </div>
            <div className="flex min-h-40 items-end border-t border-white/10 bg-[radial-gradient(circle_at_top,rgba(132,204,22,0.16),transparent_44%),rgba(255,255,255,0.03)] p-5 md:border-l md:border-t-0">
              <p className="rounded-2xl border border-white/10 bg-black/45 p-4 text-sm font-bold text-zinc-300">
                Избери ден, виж игрите и създай нова дата по-бързо.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-black/65 p-4 backdrop-blur-xl md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              onClick={() => moveMonth(-1)}
              className="rounded-2xl bg-white/[0.06] px-4 py-3 font-black hover:bg-white/[0.1]"
            >
              ←
            </button>
            <h2 className="text-center text-2xl font-black">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button
              onClick={() => moveMonth(1)}
              className="rounded-2xl bg-white/[0.06] px-4 py-3 font-black hover:bg-white/[0.1]"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
            {weekDays.map((day) => (
              <div key={day} className="py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {days.map((date, index) => {
              const key = date ? toDateKey(date) : `empty-${index}`;
              const dayGames = date
                ? gamesByDate.get(toDateKey(date)) || []
                : [];
              return (
                <div
                  key={key}
                  className={`min-h-28 rounded-2xl border p-2 ${date ? "border-white/10 bg-white/[0.035]" : "border-transparent bg-transparent"}`}
                >
                  {date && (
                    <p className="mb-2 text-sm font-black text-zinc-300">
                      {date.getDate()}
                    </p>
                  )}
                  <div className="space-y-2">
                    {dayGames.map((game) => (
                      <a
                        key={game.id}
                        href={`/admin/games/${game.id}`}
                        className={`block rounded-xl border px-2 py-2 text-left text-[11px] font-bold leading-4 ${statusClass(game.status)}`}
                      >
                        <span className="block truncate">
                          {game.game_time?.slice(0, 5)} • {game.title}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {loading && (
            <p className="mt-4 text-sm text-zinc-500">Зареждане...</p>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
