"use client";

import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import { useParams, useRouter } from "next/navigation";
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
  max_rental_sets: number;
  status: string;
  description?: string | null;
  rules_text?: string | null;
};

const gameTimeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

function dateFromInput(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function EditGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const { Dialog, bbAlert } = useBattleBookingDialog();
  const minDate = useMemo(() => new Date(2020, 0, 1), []);

  async function loadGame() {
    setLoading(true);

    try {
      const context = await getCurrentFieldContext();
      setFieldId(context.fieldId);
      setIsOwner(context.isOwner);

      let query = supabase
        .from("games")
        .select("id,title,game_date,game_time,location,max_rental_sets,status,description,rules_text,field_id")
        .eq("id", gameId);

      if (!context.isOwner) {
        if (!context.fieldId) {
          bbAlert("Нямаш достъп до тази игра.", "Забранен достъп");
          router.replace("/admin");
          return;
        }
        query = query.eq("field_id", context.fieldId);
      }

      const { data, error } = await query.single();
      if (error) throw error;

      setGame(data);
      setSelectedDate(dateFromInput(data.game_date));
    } catch (error) {
      bbAlert(error instanceof Error ? error.message : "Играта не е намерена.", "Грешка");
      router.replace("/admin");
    }

    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedDate) return bbAlert("Избери дата.", "Липсва дата");

    const formData = new FormData(e.currentTarget);
    const rentalSets = Number(formData.get("max_rental_sets"));

    setSaving(true);

    let query = supabase
      .from("games")
      .update({
        title: String(formData.get("title") || "").trim(),
        game_date: toInputDate(selectedDate),
        game_time: formData.get("game_time"),
        location: String(formData.get("location") || "").trim(),
        max_rental_sets: Number.isFinite(rentalSets) ? rentalSets : 0,
        status: formData.get("status"),
        description: String(formData.get("description") || "").trim(),
        rules_text: String(formData.get("rules_text") || "").trim(),
      })
      .eq("id", gameId);

    if (!isOwner && fieldId) query = query.eq("field_id", fieldId);

    const { error } = await query;
    setSaving(false);

    if (error) return bbAlert("Грешка при запис: " + error.message, "Грешка");
    await bbAlert("Играта е обновена успешно.", "Готово");
    router.push(`/admin/games/${gameId}`);
  }

  useEffect(() => {
    if (gameId) loadGame();
  }, [gameId]);

  return (
    <AdminShell active="games">
      <Dialog />
      <section className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-5 backdrop-blur-xl md:p-7">
        <a href={`/admin/games/${gameId}`} className="text-sm font-black text-lime-300">← Назад към играчите</a>

        <div className="mb-6 mt-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Edit Event</p>
          <h1 className="mt-2 text-4xl font-black">Редакция на игра</h1>
          <p className="mt-3 text-sm text-zinc-400">Промени детайлите, без да се губят записаните играчи.</p>
        </div>

        {loading && <p className="text-zinc-400">Зареждане...</p>}

        {!loading && game && (
          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
            <Field label="Заглавие">
              <input name="title" className="bb-input" defaultValue={game.title} required />
            </Field>

            <Field label="Дата">
              <DatePicker
                selected={selectedDate}
                onChange={(date: Date | null) => setSelectedDate(date)}
                minDate={minDate}
                dateFormat="dd.MM.yyyy"
                calendarStartDay={1}
                className="bb-input"
                required
              />
            </Field>

            <Field label="Час">
              <select name="game_time" className="bb-input" defaultValue={game.game_time?.slice(0, 5) || "11:00"} required>
                {gameTimeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
              </select>
            </Field>

            <Field label="Локация">
              <input name="location" className="bb-input" defaultValue={game.location} required />
            </Field>

            <Field label="Комплекти под наем">
              <input name="max_rental_sets" type="number" min="0" className="bb-input" defaultValue={game.max_rental_sets} required />
            </Field>

            <Field label="Статус">
              <select name="status" className="bb-input" defaultValue={game.status} required>
                <option value="active">Активна</option>
                <option value="closed">Затворена</option>
                <option value="postponed">Отложена</option>
              </select>
            </Field>

            <div className="lg:col-span-2">
              <Field label="Описание">
                <textarea name="description" className="bb-input min-h-24" defaultValue={game.description || ""} />
              </Field>
            </div>

            <div className="lg:col-span-2">
              <Field label="Правила и декларация">
                <textarea name="rules_text" className="bb-input min-h-56" defaultValue={game.rules_text || ""} />
              </Field>
            </div>

            <button disabled={saving} className="rounded-2xl bg-lime-500 p-4 font-black text-black hover:bg-lime-400 disabled:bg-zinc-700 disabled:text-zinc-400 lg:col-span-2">
              {saving ? "Записване..." : "ЗАПАЗИ ПРОМЕНИТЕ"}
            </button>
          </form>
        )}
      </section>
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
