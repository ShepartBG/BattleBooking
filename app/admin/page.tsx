"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/admin/AdminShell";

type Game = {
  id: string;
  title: string;
  game_date: string;
  game_time: string;
  location: string;
  max_rental_sets: number;
  status: string;
};

function formatDate(date: string) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export default function AdminPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);

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

  async function toggleGameStatus(gameId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "closed" : "active";
    const confirmed = confirm(
      newStatus === "closed"
        ? "Сигурен ли си, че искаш да затвориш регистрацията?"
        : "Сигурен ли си, че искаш да активираш регистрацията?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("games")
      .update({ status: newStatus })
      .eq("id", gameId);

    if (error) return alert("Грешка при промяна на статуса: " + error.message);
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
    loadGames();
    loadPendingRequests();
  }, []);

  const activeGames = games.filter((game) => game.status === "active").length;

  return (
    <AdminShell active="games">
      <section className="space-y-5">
        <div className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-6 backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                Organizer Dashboard
              </p>
              <h2 className="mt-2 text-4xl font-black">Управление на игри</h2>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href="/admin/requests"
                className="rounded-2xl border border-lime-400/25 bg-lime-400/10 px-5 py-3 text-center font-black text-lime-200 hover:bg-lime-400/15"
              >
                🔔 New Requests ({pendingRequests})
              </a>
              <a
                href="/admin/new-game"
                className="rounded-2xl bg-lime-500 px-5 py-3 text-center font-black text-black hover:bg-lime-400"
              >
                + Създай нова игра
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <DashStat label="Всички игри" value={games.length} />
            <DashStat label="Активни" value={activeGames} highlight />
            <DashStat label="Затворени" value={games.length - activeGames} />
          </div>
        </div>

        <div className="grid gap-4">
          {games.map((game) => (
            <article
              key={game.id}
              className="rounded-[2rem] border border-white/10 bg-black/65 p-5 backdrop-blur-xl"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-black">{game.title}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        game.status === "active"
                          ? "border border-lime-400/30 bg-lime-400/10 text-lime-300"
                          : "border border-red-400/30 bg-red-400/10 text-red-300"
                      }`}
                    >
                      {game.status === "active" ? "ОТВОРЕНА" : "ЗАТВОРЕНА"}
                    </span>
                  </div>

                  <p className="mt-3 text-zinc-300">
                    📅 {formatDate(game.game_date)} • 🕒 {game.game_time?.slice(0, 5)} • 📍 {game.location}
                  </p>
                  <p className="mt-1 text-zinc-500">🎒 Комплекти под наем: {game.max_rental_sets}</p>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <a className="rounded-xl bg-white/[0.06] px-4 py-2 font-bold hover:bg-white/[0.1]" href={`/admin/games/${game.id}`}>
                    Играчите
                  </a>
                  <a className="rounded-xl bg-blue-600 px-4 py-2 font-bold hover:bg-blue-500" href={`/game/${game.id}`} target="_blank">
                    Отвори
                  </a>
                  <button className="rounded-xl bg-purple-600 px-4 py-2 font-bold hover:bg-purple-500" onClick={() => copyRegistrationLink(game.id)}>
                    Копирай
                  </button>
                  <button
                    onClick={() => toggleGameStatus(game.id, game.status)}
                    className={`rounded-xl px-4 py-2 font-bold ${
                      game.status === "active" ? "bg-red-600 hover:bg-red-500" : "bg-lime-600 hover:bg-lime-500"
                    }`}
                  >
                    {game.status === "active" ? "Затвори" : "Активирай"}
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

function DashStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-4xl font-black ${highlight ? "text-lime-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
