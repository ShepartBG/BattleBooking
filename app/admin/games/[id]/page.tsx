"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/admin/AdminShell";
import { useBattleBookingDialog } from "@/components/ui/useBattleBookingDialog";
import { getCurrentFieldContext } from "@/lib/currentField";

type Registration = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  age: number;
  participation_type: string;
  registration_code: string;
  created_at: string;
  status: string;
  isVeteran?: boolean;
};

type Game = {
  id: string;
  title: string;
  game_date: string;
  game_time: string;
  location: string;
  max_rental_sets: number;
};

function formatDate(date: string) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

export default function GamePlayersPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [players, setPlayers] = useState<Registration[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const { Dialog, bbAlert, bbConfirm } = useBattleBookingDialog();

  async function cancelPlayer(playerId: string) {
    const confirmed = await bbConfirm("Сигурен ли си, че искаш да анулираш този играч?", "Анулиране на играч");
    if (!confirmed) return;

    if (!isOwner && !fieldId) {
      return bbAlert("Нямаш право да анулираш играч от тази игра.", "Забранен достъп");
    }

    const { error } = await supabase
      .from("registrations")
      .update({ status: "cancelled" })
      .eq("id", playerId);

    if (error) return bbAlert("Грешка при анулиране: " + error.message, "Грешка");
    await loadData();
  }

  async function loadData() {
    setLoading(true);

    let context;
    try {
      context = await getCurrentFieldContext();
      setFieldId(context.fieldId);
      setIsOwner(context.isOwner);
    } catch (error) {
      bbAlert(error instanceof Error ? error.message : "Грешка при проверка на достъпа.", "Грешка");
      setLoading(false);
      return;
    }

    let gameQuery = supabase
      .from("games")
      .select("id, title, game_date, game_time, location, max_rental_sets, field_id")
      .eq("id", gameId);

    if (!context.isOwner) {
      if (!context.fieldId) {
        bbAlert("Нямаш достъп до тази игра.", "Забранен достъп");
        router.replace("/admin");
        setLoading(false);
        return;
      }
      gameQuery = gameQuery.eq("field_id", context.fieldId);
    }

    const { data: gameData, error: gameError } = await gameQuery.single();

    if (gameError) {
      bbAlert("Играта не е намерена или нямаш достъп до нея: " + gameError.message, "Грешка");
      router.replace("/admin");
      setLoading(false);
      return;
    }

    const { data: playersData, error: playersError } = await supabase
      .from("registrations")
      .select("*")
      .eq("game_id", gameId)
      .eq("status", "active")
      .order("created_at", { ascending: true });

    if (playersError) {
      bbAlert("Грешка при зареждане на играчите: " + playersError.message, "Грешка");
      setLoading(false);
      return;
    }

    const phones = (playersData || []).map((player) => player.phone);

    const { data: previousRegistrations, error: previousError } = await supabase
      .from("registrations")
      .select("phone, game_id")
      .in("phone", phones.length > 0 ? phones : ["__none__"])
      .neq("game_id", gameId)
      .eq("status", "active");

    if (previousError) {
      bbAlert("Грешка при проверка за ветерани: " + previousError.message, "Грешка");
      setLoading(false);
      return;
    }

    const veteranPhones = new Set(
      (previousRegistrations || []).map((item) => item.phone)
    );

    setGame(gameData);
    setPlayers(
      (playersData || []).map((player) => ({
        ...player,
        isVeteran: veteranPhones.has(player.phone),
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    if (gameId) loadData();
  }, [gameId]);

  const rentalCount = players.filter((p) => p.participation_type === "rental").length;
  const ownCount = players.filter((p) => p.participation_type === "own").length;
  const minorsCount = players.filter((p) => p.age < 18).length;
  const veteransCount = players.filter((p) => p.isVeteran).length;
  const newPlayersCount = players.filter((p) => !p.isVeteran).length;
  const maxRentalSets = game?.max_rental_sets ?? 0;
  const freeRentalSets = maxRentalSets - rentalCount;

  return (
    <AdminShell active="games">
      <Dialog />
      <section className="space-y-5">
        <div className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-6 backdrop-blur-xl">
          <a href="/admin" className="text-sm font-black text-lime-300">
            ← Назад към игрите
          </a>

          <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
                Players Control
              </p>
              <h1 className="mt-2 text-4xl font-black">Записани играчи</h1>
              {game && (
                <p className="mt-3 text-zinc-300">
                  {game.title} • 📅 {formatDate(game.game_date)} • 🕒 {game.game_time?.slice(0, 5)} • 📍 {game.location}
                </p>
              )}
            </div>

            <a
              href={`/game/${gameId}`}
              target="_blank"
              className="rounded-2xl bg-lime-500 px-5 py-3 text-center font-black text-black hover:bg-lime-400"
            >
              Отвори записването
            </a>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Общо" value={players.length} />
          <Stat label="Под наем" value={`${rentalCount} / ${maxRentalSets}`} />
          <Stat label="Свободни" value={freeRentalSets} highlight />
          <Stat label="Собствено" value={ownCount} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Stat label="Непълнолетни" value={minorsCount} />
          <Stat label="Нови играчи" value={newPlayersCount} />
          <Stat label="Ветерани" value={veteransCount} highlight />
        </div>

        {loading && <p className="text-zinc-400">Зареждане...</p>}

        {!loading && players.length === 0 && (
          <div className="rounded-[2rem] border border-white/10 bg-black/65 p-8 text-center text-zinc-400">
            Още няма записани играчи.
          </div>
        )}

        {!loading && players.length > 0 && (
          <div className="overflow-x-auto rounded-[2rem] border border-white/10 bg-black/65 backdrop-blur-xl">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-[0.18em] text-zinc-500">
                <tr>
                  <th className="p-4">Име</th>
                  <th className="p-4">Статус</th>
                  <th className="p-4">Телефон</th>
                  <th className="p-4">Възраст</th>
                  <th className="p-4">Участие</th>
                  <th className="p-4">Код</th>
                  <th className="p-4">Действие</th>
                </tr>
              </thead>

              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b border-white/5 last:border-0">
                    <td className="p-4 font-bold">
                      {player.first_name} {player.last_name}
                      {player.age < 18 && <span className="ml-2 text-yellow-400">🧒</span>}
                    </td>
                    <td className="p-4">
                      {player.isVeteran ? (
                        <span className="font-black text-yellow-400">⭐ Ветеран</span>
                      ) : (
                        <span className="font-black text-lime-400">🆕 Нов</span>
                      )}
                    </td>
                    <td className="p-4 text-zinc-300">{player.phone}</td>
                    <td className="p-4 text-zinc-300">{player.age}</td>
                    <td className="p-4 text-zinc-300">
                      {player.participation_type === "rental" ? "Под наем" : "Собствено"}
                    </td>
                    <td className="p-4 font-black text-lime-300">{player.registration_code}</td>
                    <td className="p-4">
                      <button
                        onClick={() => cancelPlayer(player.id)}
                        className="rounded-xl bg-red-600 px-3 py-2 text-sm font-bold hover:bg-red-500"
                      >
                        Анулирай
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/65 p-5 backdrop-blur-xl">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-4xl font-black ${highlight ? "text-lime-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
