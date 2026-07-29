"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/admin/AdminShell";
import { isOwnerEmail } from "@/lib/access";
import { getCurrentFieldContext } from "@/lib/currentField";
import { useBattleBookingDialog } from "@/components/ui/useBattleBookingDialog";
import { SkeletonBox, SkeletonLine } from "@/components/ui/Skeleton";
import { isUrlLocation, normalizeLocationUrl, shortLocationLabel } from "@/utils/location";

type Game = {
  id: string;
  title: string;
  game_date: string;
  game_time: string;
  location: string;
  max_rental_sets: number;
  status: string;
  postponed_reason?: string | null;
};

type ActivityItem = {
  id: string;
  first_name: string;
  last_name: string;
  participation_type: string;
  created_at: string;
  game_id: string;
};

function formatDate(date: string) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export default function AdminPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isOwner, setIsOwner] = useState(false);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const { Dialog, bbAlert, bbConfirm, bbPrompt } = useBattleBookingDialog();

  async function loadPendingRequests() {
    const { count, error } = await supabase
      .from("field_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (!error) setPendingRequests(count || 0);
  }

  async function loadGames(nextFieldId = fieldId, ownerMode = isOwner) {
    let query = supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false });

    if (!ownerMode) {
      if (!nextFieldId) {
        setGames([]);
        setActivity([]);
        return [] as Game[];
      }
      query = query.eq("field_id", nextFieldId);
    }

    const { data, error } = await query;

    if (error) {
      bbAlert("Грешка при зареждане: " + error.message, "Грешка");
      return [] as Game[];
    }

    const loadedGames = (data || []) as Game[];
    setGames(loadedGames);
    return loadedGames;
  }

  async function loadActivity(gameIds: string[]) {
    if (gameIds.length === 0) {
      setActivity([]);
      return;
    }

    const { data, error } = await supabase
      .from("registrations")
      .select("id,first_name,last_name,participation_type,created_at,game_id")
      .in("game_id", gameIds)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8);

    if (!error) setActivity((data || []) as ActivityItem[]);
  }

  async function updateGameStatus(
    gameId: string,
    newStatus: "active" | "closed" | "postponed",
  ) {
    let postponedReason: string | null = null;

    if (newStatus === "postponed") {
      const reason = await bbPrompt(
        "Причина за отлагане:\n\nНапример: Лоши метеорологични условия или недостатъчен брой записани играчи.",
        "Играта се отлага поради организационни причини.",
        "Отлагане на игра",
      );

      if (reason === null) return;
      postponedReason =
        reason.trim() || "Играта се отлага поради организационни причини.";
    } else {
      const confirmed = await bbConfirm(
        newStatus === "closed"
          ? "Сигурен ли си, че искаш да затвориш играта?"
          : "Сигурен ли си, че искаш да активираш играта?",
        newStatus === "closed" ? "Затваряне на игра" : "Активиране на игра",
      );

      if (!confirmed) return;
    }

    const payload: { status: string; postponed_reason?: string | null } = {
      status: newStatus,
    };

    if (newStatus === "postponed") payload.postponed_reason = postponedReason;
    if (newStatus === "active") payload.postponed_reason = null;

    let updateQuery = supabase.from("games").update(payload).eq("id", gameId);
    if (!isOwner && fieldId) updateQuery = updateQuery.eq("field_id", fieldId);

    const { error } = await updateQuery;

    if (error)
      return bbAlert(
        "Грешка при промяна на статуса: " + error.message,
        "Грешка",
      );
    const loadedGames = await loadGames();
    await loadActivity(loadedGames.map((game) => game.id));
  }

  async function deleteGame(gameId: string, title: string) {
    const confirmed = await bbConfirm(
      `Сигурен ли си, че искаш да изтриеш играта "${title}"?\n\nТова ще изтрие и записаните играчи към нея.`,
      "Изтриване на игра",
    );

    if (!confirmed) return;

    const gameIsAllowed =
      isOwner || games.some((game) => game.id === gameId && (!fieldId || true));
    if (!gameIsAllowed) {
      return bbAlert("Нямаш право да изтриеш тази игра.", "Забранен достъп");
    }

    const { error: registrationsError } = await supabase
      .from("registrations")
      .delete()
      .eq("game_id", gameId);

    if (registrationsError) {
      return bbAlert(
        "Грешка при изтриване на записванията: " + registrationsError.message,
        "Грешка",
      );
    }

    let deleteQuery = supabase.from("games").delete().eq("id", gameId);
    if (!isOwner && fieldId) deleteQuery = deleteQuery.eq("field_id", fieldId);

    const { error } = await deleteQuery;

    if (error)
      return bbAlert(
        "Грешка при изтриване на играта: " + error.message,
        "Грешка",
      );
    const loadedGames = await loadGames();
    await loadActivity(loadedGames.map((game) => game.id));
  }

  async function copyRegistrationLink(gameId: string) {
    const link = `${window.location.origin}/game/${gameId}`;
    try {
      await navigator.clipboard.writeText(link);
      bbAlert("Линкът за записване е копиран!", "Готово");
    } catch {
      bbAlert("Не успях да копирам линка. Линк: " + link, "Грешка");
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const { data } = await supabase.auth.getUser();
        const owner = isOwnerEmail(data.user?.email || "");
        const context = await getCurrentFieldContext();
        if (!mounted) return;

        const ownerMode = owner || context.isOwner;
        setIsOwner(ownerMode);
        setFieldId(context.fieldId);
        const loadedGames = await loadGames(context.fieldId, ownerMode);
        await loadActivity(loadedGames.map((game) => game.id));
        if (ownerMode) await loadPendingRequests();
        setIsLoading(false);
      } catch (error) {
        if (!mounted) return;
        setIsLoading(false);
        bbAlert(
          error instanceof Error
            ? error.message
            : "Грешка при зареждане на профила.",
          "Грешка",
        );
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const activeGames = games.filter((game) => game.status === "active").length;
  const postponedGames = games.filter(
    (game) => game.status === "postponed",
  ).length;
  const closedGames = games.filter((game) => game.status === "closed").length;

  return (
    <AdminShell active="games">
      <Dialog />
      <section className="space-y-4 sm:space-y-5">
        <div className="overflow-hidden rounded-[1.75rem] border border-lime-400/15 bg-black/65 backdrop-blur-xl sm:rounded-[2rem]">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="p-4 sm:p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                    Контролен панел
                  </p>
                  <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                    Управление на игри
                  </h2>
                </div>

                <div className="grid gap-2 sm:flex sm:flex-row">
                  {isOwner && (
                    <a
                      href="/admin/requests"
                      className="min-h-12 rounded-2xl border border-lime-400/25 bg-lime-400/10 px-5 py-3 text-center font-black text-lime-200 hover:bg-lime-400/15"
                    >
                      🔔 New Requests ({pendingRequests})
                    </a>
                  )}
                  <a
                    href="/admin/new-game"
                    className="min-h-12 rounded-2xl bg-lime-500 px-5 py-3 text-center font-black text-black hover:bg-lime-400"
                  >
                    + Създай нова игра
                  </a>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <DashStat label="Всички игри" value={games.length} loading={isLoading} />
                <DashStat label="Активни" value={activeGames} loading={isLoading} highlight />
                <DashStat label="Отложени" value={postponedGames} loading={isLoading} />
                <DashStat label="Затворени" value={closedGames} loading={isLoading} />
              </div>
            </div>
            <div className="flex min-h-48 items-end border-t border-white/10 bg-[radial-gradient(circle_at_top,rgba(132,204,22,0.18),transparent_42%),rgba(255,255,255,0.03)] p-5 lg:min-h-full lg:border-l lg:border-t-0">
              <div className="rounded-2xl border border-white/10 bg-black/45 p-4 backdrop-blur-xl">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-lime-300">
                  Live Ops
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  Бърз контрол за игри, записвания и линкове.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            {isLoading && (
              <>
                <AdminGameSkeleton />
                <AdminGameSkeleton />
                <AdminGameSkeleton />
              </>
            )}
            {!isLoading && games.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-black/55 p-5 text-zinc-400">
                Все още няма създадени игри.
              </p>
            )}
            {games.map((game) => (
              <article
                key={game.id}
                className="rounded-[1.75rem] border border-white/10 bg-black/65 p-4 sm:rounded-[2rem] sm:p-5 backdrop-blur-xl"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-black sm:text-2xl">
                        {game.title}
                      </h3>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(game.status)}`}
                      >
                        {getStatusLabel(game.status)}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-zinc-300 sm:text-base">
                      📅 {formatDate(game.game_date)} • 🕒{" "}
                      {game.game_time?.slice(0, 5)} • <AdminLocation value={game.location} />
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      🎒 Комплекти под наем: {game.max_rental_sets}
                    </p>
                    {game.status === "postponed" && (
                      <p className="mt-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm font-bold text-red-200">
                        🚨 Играта е отложена:{" "}
                        {game.postponed_reason ||
                          "Играта се отлага поради организационни причини."}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                    <a
                      className="min-h-11 rounded-xl bg-white/[0.06] px-4 py-2.5 text-center font-bold hover:bg-white/[0.1]"
                      href={`/admin/games/${game.id}`}
                    >
                      Играчите
                    </a>
                    <a
                      className="min-h-11 rounded-xl bg-amber-600 px-4 py-2.5 text-center font-bold hover:bg-amber-500"
                      href={`/admin/games/${game.id}/edit`}
                    >
                      Редакция
                    </a>
                    <a
                      className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-center font-bold hover:bg-blue-500"
                      href={`/game/${game.id}`}
                      target="_blank"
                    >
                      Отвори
                    </a>
                    <button
                      className="min-h-11 rounded-xl bg-purple-600 px-4 py-2.5 text-center font-bold hover:bg-purple-500"
                      onClick={() => copyRegistrationLink(game.id)}
                    >
                      Копирай
                    </button>
                    {game.status !== "active" && (
                      <button
                        onClick={() => updateGameStatus(game.id, "active")}
                        className="min-h-11 rounded-xl bg-lime-600 px-4 py-2.5 text-center font-bold hover:bg-lime-500"
                      >
                        Активирай
                      </button>
                    )}
                    {game.status !== "postponed" && (
                      <button
                        onClick={() => updateGameStatus(game.id, "postponed")}
                        className="min-h-11 rounded-xl bg-red-700 px-4 py-2.5 text-center font-bold hover:bg-red-600"
                      >
                        Отложи
                      </button>
                    )}
                    {game.status !== "closed" && (
                      <button
                        onClick={() => updateGameStatus(game.id, "closed")}
                        className="min-h-11 rounded-xl bg-zinc-700 px-4 py-2.5 text-center font-bold hover:bg-zinc-600"
                      >
                        Затвори
                      </button>
                    )}
                    <button
                      onClick={() => deleteGame(game.id, game.title)}
                      title="Изтрий играта"
                      aria-label="Изтрий играта"
                      className="min-h-11 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-lg font-black text-red-300 hover:bg-red-500/20"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="rounded-[1.75rem] border border-white/10 bg-black/65 p-4 backdrop-blur-xl sm:rounded-[2rem] sm:p-5 xl:sticky xl:top-24 xl:h-fit">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-500">
                  Activity Feed
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  Последни записвания
                </h2>
              </div>
              <span className="rounded-2xl bg-lime-400/10 px-3 py-2 text-xl">
                ⚡
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {isLoading && (
                <>
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                </>
              )}

              {!isLoading && activity.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-400">
                  Няма скорошни записвания към заредените игри.
                </p>
              )}

              {activity.map((item) => {
                const game = games.find(
                  (nextGame) => nextGame.id === item.game_id,
                );
                return (
                  <a
                    key={item.id}
                    href={game ? `/admin/games/${game.id}` : "/admin"}
                    className="block rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-lime-400/25 hover:bg-white/[0.06]"
                  >
                    <p className="font-black text-white">
                      {item.first_name} {item.last_name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {item.participation_type === "rental"
                        ? "🎒 Под наем"
                        : "🔫 Собствено"}{" "}
                      • {game?.title || "Игра"}
                    </p>
                  </a>
                );
              })}
            </div>
          </aside>
        </div>
      </section>
    </AdminShell>
  );
}

function getStatusLabel(status: string) {
  if (status === "active") return "ОТВОРЕНА";
  if (status === "postponed") return "ОТЛОЖЕНА";
  return "ЗАТВОРЕНА";
}

function getStatusBadgeClass(status: string) {
  if (status === "active")
    return "border-lime-400/30 bg-lime-400/10 text-lime-300";
  if (status === "postponed")
    return "border-red-400/40 bg-red-500/15 text-red-300";
  return "border-zinc-400/30 bg-zinc-500/10 text-zinc-300";
}

function DashStat({
  label,
  value,
  highlight,
  loading = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 sm:p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      {loading ? (
        <SkeletonLine className="mt-3 h-9 w-16" />
      ) : (
        <p
          className={`mt-1 text-3xl font-black sm:text-4xl ${highlight ? "text-lime-300" : "text-white"}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function AdminGameSkeleton() {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-black/65 p-4 backdrop-blur-xl sm:rounded-[2rem] sm:p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="w-full max-w-xl">
          <div className="flex flex-wrap items-center gap-3">
            <SkeletonLine className="h-7 w-56" />
            <SkeletonLine className="h-7 w-28" />
          </div>
          <SkeletonLine className="mt-5 h-5 w-full" />
          <SkeletonLine className="mt-3 h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBox key={index} className="h-11 w-full sm:w-24" />
          ))}
        </div>
      </div>
    </article>
  );
}

function ActivitySkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <SkeletonLine className="h-5 w-40" />
      <SkeletonLine className="mt-3 h-4 w-56" />
    </div>
  );
}

function AdminLocation({ value }: { value: string }) {
  if (isUrlLocation(value)) {
    return (
      <a
        href={normalizeLocationUrl(value)}
        target="_blank"
        rel="noreferrer"
        className="font-black text-lime-300 underline-offset-4 hover:underline"
      >
        📍 {shortLocationLabel(value)}
      </a>
    );
  }

  return <span>📍 {shortLocationLabel(value)}</span>;
}
