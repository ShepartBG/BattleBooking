"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { getCurrentFieldContext } from "@/lib/currentField";
import { useBattleBookingDialog } from "@/components/ui/useBattleBookingDialog";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";

type Game = {
  id: string;
  title: string;
  game_date: string;
  game_time: string;
  max_rental_sets: number;
  status: string;
};

type Registration = {
  id: string;
  game_id: string;
  phone: string;
  participation_type: string;
  status: string;
  created_at: string;
};

function formatDate(date: string) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export default function AdminStatsPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const { Dialog, bbAlert } = useBattleBookingDialog();

  async function loadStats() {
    setLoading(true);

    try {
      const context = await getCurrentFieldContext();
      let gamesQuery = supabase
        .from("games")
        .select("id,title,game_date,game_time,max_rental_sets,status,field_id")
        .order("game_date", { ascending: false })
        .limit(50);

      if (!context.isOwner) {
        if (!context.fieldId) {
          setGames([]);
          setRegistrations([]);
          setLoading(false);
          return;
        }
        gamesQuery = gamesQuery.eq("field_id", context.fieldId);
      }

      const { data: gamesData, error: gamesError } = await gamesQuery;
      if (gamesError) throw gamesError;

      const gameIds = (gamesData || []).map((game) => game.id);
      let registrationsData: Registration[] = [];

      if (gameIds.length > 0) {
        const { data, error } = await supabase
          .from("registrations")
          .select("id,game_id,phone,participation_type,status,created_at")
          .in("game_id", gameIds)
          .eq("status", "active");
        if (error) throw error;
        registrationsData = data || [];
      }

      setGames(gamesData || []);
      setRegistrations(registrationsData);
    } catch (error) {
      bbAlert(
        error instanceof Error
          ? error.message
          : "Грешка при зареждане на статистиката.",
        "Грешка",
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  const stats = useMemo(() => {
    const totalPlayers = registrations.length;
    const rentalPlayers = registrations.filter(
      (item) => item.participation_type === "rental",
    ).length;
    const ownPlayers = registrations.filter(
      (item) => item.participation_type === "own",
    ).length;
    const uniquePlayers = new Set(registrations.map((item) => item.phone)).size;
    const averagePlayers =
      games.length > 0 ? Math.round(totalPlayers / games.length) : 0;

    const byGame = games.map((game) => ({
      ...game,
      players: registrations.filter((item) => item.game_id === game.id).length,
      rentals: registrations.filter(
        (item) =>
          item.game_id === game.id && item.participation_type === "rental",
      ).length,
    }));

    const topGame =
      [...byGame].sort((a, b) => b.players - a.players)[0] || null;

    return {
      totalPlayers,
      rentalPlayers,
      ownPlayers,
      uniquePlayers,
      averagePlayers,
      byGame,
      topGame,
    };
  }, [games, registrations]);

  return (
    <AdminShell active="stats">
      <Dialog />
      <section className="space-y-5">
        <div className="overflow-hidden rounded-[2rem] border border-lime-400/15 bg-black/65 backdrop-blur-xl">
          <div className="grid md:grid-cols-[1.4fr_0.6fr]">
            <div className="p-5 md:p-7">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                Statistics
              </p>
              <h1 className="mt-2 text-4xl font-black">Статистика</h1>
              <p className="mt-3 text-sm text-zinc-400">
                Общ преглед на последните до 50 игри.
              </p>
            </div>
            <div className="flex min-h-40 items-end border-t border-white/10 bg-[radial-gradient(circle_at_top,rgba(132,204,22,0.16),transparent_44%),rgba(255,255,255,0.03)] p-5 md:border-l md:border-t-0">
              <p className="rounded-2xl border border-white/10 bg-black/45 p-4 text-sm font-bold text-zinc-300">
                Числата са извадени от реалните игри и активни регистрации.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label="Игри" value={games.length} loading={loading} />
          <Stat label="Играчи" value={stats.totalPlayers} loading={loading} highlight />
          <Stat label="Уникални" value={stats.uniquePlayers} loading={loading} />
          <Stat label="Средно/игра" value={stats.averagePlayers} loading={loading} />
          <Stat label="Под наем" value={stats.rentalPlayers} loading={loading} />
          <Stat label="Собствено" value={stats.ownPlayers} loading={loading} />
        </div>

        {!loading && stats.topGame && (
          <div className="rounded-[2rem] border border-lime-400/15 bg-lime-400/10 p-5 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300">
              Най-силна игра
            </p>
            <h2 className="mt-2 text-2xl font-black">{stats.topGame.title}</h2>
            <p className="mt-2 text-zinc-300">
              📅 {formatDate(stats.topGame.game_date)} • 🕒{" "}
              {stats.topGame.game_time?.slice(0, 5)} • 👥{" "}
              {stats.topGame.players} играчи
            </p>
          </div>
        )}

        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/65 backdrop-blur-xl">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-2xl font-black">Игри по резултат</h2>
          </div>

          {loading && <StatsTableSkeleton />}

          {!loading && stats.byGame.length === 0 && (
            <p className="p-5 text-zinc-400">Няма данни.</p>
          )}

          {!loading && stats.byGame.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-zinc-500">
                  <tr>
                    <th className="p-4">Игра</th>
                    <th className="p-4">Дата</th>
                    <th className="p-4">Играчите</th>
                    <th className="p-4">Наеми</th>
                    <th className="p-4">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byGame.map((game) => (
                    <tr
                      key={game.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="p-4 font-bold">
                        <a
                          className="text-lime-300 hover:text-lime-200"
                          href={`/admin/games/${game.id}`}
                        >
                          {game.title}
                        </a>
                      </td>
                      <td className="p-4 text-zinc-300">
                        {formatDate(game.game_date)}
                      </td>
                      <td className="p-4 font-black text-white">
                        {game.players}
                      </td>
                      <td className="p-4 text-zinc-300">
                        {game.rentals} / {game.max_rental_sets}
                      </td>
                      <td className="p-4 text-zinc-300">{game.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  highlight,
  loading = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/65 p-4 backdrop-blur-xl">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      {loading ? (
        <SkeletonLine className="mt-4 h-10 w-20" />
      ) : (
        <p
          className={`mt-2 text-4xl font-black ${highlight ? "text-lime-300" : "text-white"}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function StatsTableSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <SkeletonLine className="h-5 w-full" />
          <SkeletonLine className="h-5 w-24" />
          <SkeletonLine className="h-5 w-16" />
          <SkeletonLine className="h-5 w-20" />
          <SkeletonLine className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}
