"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/admin/AdminShell";
import { isOwnerEmail } from "@/lib/access";

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

function formatDate(date: string) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export default function AdminPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [isOwner, setIsOwner] = useState(false);

  async function loadPendingRequests() {
    const { count, error } = await supabase
      .from("field_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    if (!error) setPendingRequests(count || 0);
  }

  async function loadGames() {
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return alert("Грешка при зареждане: " + error.message);
    setGames(data || []);
  }

  async function updateGameStatus(gameId: string, newStatus: "active" | "closed" | "postponed") {
    let postponedReason: string | null = null;

    if (newStatus === "postponed") {
      const reason = prompt(
        "Причина за отлагане:\n\nНапример: Лоши метеорологични условия или недостатъчен брой записани играчи.",
        "Играта се отлага поради организационни причини.",
      );

      if (reason === null) return;
      postponedReason = reason.trim() || "Играта се отлага поради организационни причини.";
    } else {
      const confirmed = confirm(
        newStatus === "closed"
          ? "Сигурен ли си, че искаш да затвориш играта?"
          : "Сигурен ли си, че искаш да активираш играта?",
      );

      if (!confirmed) return;
    }

    const payload: { status: string; postponed_reason?: string | null } = {
      status: newStatus,
    };

    if (newStatus === "postponed") payload.postponed_reason = postponedReason;
    if (newStatus === "active") payload.postponed_reason = null;

    const { error } = await supabase.from("games").update(payload).eq("id", gameId);

    if (error) return alert("Грешка при промяна на статуса: " + error.message);
    await loadGames();
  }


  async function deleteGame(gameId: string, title: string) {
    const confirmed = confirm(
      `Сигурен ли си, че искаш да изтриеш играта "${title}"?\n\nТова ще изтрие и записаните играчи към нея.`
    );

    if (!confirmed) return;

    const { error: registrationsError } = await supabase
      .from("registrations")
      .delete()
      .eq("game_id", gameId);

    if (registrationsError) {
      return alert("Грешка при изтриване на записванията: " + registrationsError.message);
    }

    const { error } = await supabase.from("games").delete().eq("id", gameId);

    if (error) return alert("Грешка при изтриване на играта: " + error.message);
    await loadGames();
  }

  async function copyRegistrationLink(gameId: string) {
    const link = `${window.location.origin}/game/${gameId}`;
    try {
      await navigator.clipboard.writeText(link);
      alert("Линкът за записване е копиран!");
    } catch {
      alert("Не успях да копирам линка. Линк: " + link);
    }
  }

  useEffect(() => {
    async function loadDashboard() {
      const { data } = await supabase.auth.getUser();
      const owner = isOwnerEmail(data.user?.email || "");
      setIsOwner(owner);
      await loadGames();
      if (owner) await loadPendingRequests();
    }

    loadDashboard();
  }, []);

  const activeGames = games.filter((game) => game.status === "active").length;
  const postponedGames = games.filter((game) => game.status === "postponed").length;
  const closedGames = games.filter((game) => game.status === "closed").length;

  return (
    <AdminShell active="games">
      <section className="space-y-4 sm:space-y-5">
        <div className="rounded-[1.75rem] border border-lime-400/15 bg-black/65 p-4 sm:rounded-[2rem] sm:p-6 backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                Organizer Dashboard
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">Управление на игри</h2>
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
            <DashStat label="Всички игри" value={games.length} />
            <DashStat label="Активни" value={activeGames} highlight />
            <DashStat label="Отложени" value={postponedGames} />
            <DashStat label="Затворени" value={closedGames} />
          </div>
        </div>

        <div className="grid gap-4">
          {games.map((game) => (
            <article
              key={game.id}
              className="rounded-[1.75rem] border border-white/10 bg-black/65 p-4 sm:rounded-[2rem] sm:p-5 backdrop-blur-xl"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-black sm:text-2xl">{game.title}</h3>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusBadgeClass(game.status)}`}>
                      {getStatusLabel(game.status)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-zinc-300 sm:text-base">
                    📅 {formatDate(game.game_date)} • 🕒 {game.game_time?.slice(0, 5)} • 📍 {game.location}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">🎒 Комплекти под наем: {game.max_rental_sets}</p>
                  {game.status === "postponed" && (
                    <p className="mt-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm font-bold text-red-200">
                      🚨 Играта е отложена: {game.postponed_reason || "Играта се отлага поради организационни причини."}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                  <a className="min-h-11 rounded-xl bg-white/[0.06] px-4 py-2.5 text-center font-bold hover:bg-white/[0.1]" href={`/admin/games/${game.id}`}>
                    Играчите
                  </a>
                  <a className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-center font-bold hover:bg-blue-500" href={`/game/${game.id}`} target="_blank">
                    Отвори
                  </a>
                  <button className="min-h-11 rounded-xl bg-purple-600 px-4 py-2.5 text-center font-bold hover:bg-purple-500" onClick={() => copyRegistrationLink(game.id)}>
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
  if (status === "active") return "border-lime-400/30 bg-lime-400/10 text-lime-300";
  if (status === "postponed") return "border-red-400/40 bg-red-500/15 text-red-300";
  return "border-zinc-400/30 bg-zinc-500/10 text-zinc-300";
}

function DashStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 sm:p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-3xl font-black sm:text-4xl ${highlight ? "text-lime-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
