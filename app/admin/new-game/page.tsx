"use client";

import { useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import { supabase } from "@/lib/supabase";
import AdminShell from "@/components/admin/AdminShell";
import { useBattleBookingDialog } from "@/components/ui/useBattleBookingDialog";

const defaultRules = `1. Всички участници са длъжни да носят защитни очила през цялото време на игра.
2. Забранено е свалянето на защитата в активната зона.
3. Забранени са физически контакт, агресия, обиди и опасно поведение.
4. Забранена е употребата на алкохол и наркотични вещества преди и по време на игра.
5. Играчите са длъжни да спазват указанията на организаторите.
6. Участието е доброволно и всеки участник носи лична отговорност за поведението си.
7. При нарушение организаторът има право да отстрани участник от играта.`;

function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const gameTimeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0");
  const minute = index % 2 === 0 ? "00" : "30";
  return `${hour}:${minute}`;
});

export default function NewGamePage() {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const { Dialog, bbAlert } = useBattleBookingDialog();
  const minDate = useMemo(() => new Date(), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedDate) return bbAlert("Избери дата от календара.", "Липсва дата");

    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const rentalSets = Number(formData.get("max_rental_sets"));
    const settlement = String(formData.get("settlement") || "").trim();
    const region = String(formData.get("region") || "").trim();
    const exactLocation = String(formData.get("exact_location") || "").trim();
    const finalLocation =
      exactLocation ||
      [settlement, region ? `област ${region}` : ""].filter(Boolean).join(", ");

    const { error } = await supabase.from("games").insert({
      title: formData.get("title"),
      game_date: toInputDate(selectedDate),
      game_time: formData.get("game_time"),
      location: finalLocation,
      max_rental_sets: Number.isFinite(rentalSets) ? rentalSets : 0,
      rules_text: formData.get("rules_text"),
      rules_version: "v1.0",
      status: formData.get("status"),
      description: formData.get("description"),
    });

    setLoading(false);

    if (error) return bbAlert("Грешка при създаване: " + error.message, "Грешка");

    bbAlert("Играта е създадена успешно!", "Готово");
    form.reset();
    setSelectedDate(new Date());
  }

  return (
    <AdminShell active="new-game">
      <Dialog />
      <section className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-5 backdrop-blur-xl md:p-7">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
            Create Event
          </p>
          <h2 className="mt-2 text-4xl font-black">Създай нова игра</h2>
          <p className="mt-3 text-sm text-zinc-400">
            Датата се избира от удобен календар. Локацията остава ръчна, за да
            не ограничаваме организаторите.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
          <Field label="Заглавие">
            <input
              name="title"
              className="bb-input"
              placeholder="Напр. Warzone Неделна игра"
              required
            />
          </Field>

          <Field label="Дата">
            <div className="space-y-3">
              <DatePicker
                selected={selectedDate}
                onChange={(date: Date | null) => setSelectedDate(date)}
                minDate={minDate}
                dateFormat="dd.MM.yyyy"
                calendarStartDay={1}
                className="bb-input"
                placeholderText="Избери дата от календара"
                required
              />
            </div>
          </Field>

          <Field label="Час">
            <select
              name="game_time"
              className="bb-input"
              defaultValue="11:00"
              required
            >
              {gameTimeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Населено място">
            <input
              name="settlement"
              className="bb-input"
              placeholder="Напр. с. Бутан"
              required
            />
          </Field>

          <Field label="Област">
            <input
              name="region"
              className="bb-input"
              placeholder="Напр. Враца"
              required
            />
          </Field>

          <Field label="Точна локация / терен">
            <input
              name="exact_location"
              className="bb-input"
              placeholder="По желание: GPS, терен, квартал или по-точен адрес"
            />
          </Field>

          <Field label="Комплекти под наем">
            <input
              name="max_rental_sets"
              type="number"
              min="0"
              className="bb-input"
              placeholder="Въведи брой комплекти"
              required
            />
          </Field>

          <Field label="Статус">
            <select
              name="status"
              className="bb-input"
              defaultValue="active"
              required
            >
              <option value="active">Активна</option>
              <option value="closed">Затворена</option>
              <option value="postponed">Отложена</option>
            </select>
          </Field>

          <div className="lg:col-span-2">
            <Field label="Описание">
              <textarea
                name="description"
                className="bb-input min-h-24"
                placeholder="Кратко описание на играта"
              />
            </Field>
          </div>

          <div className="lg:col-span-2">
            <Field label="Правила и декларация">
              <textarea
                name="rules_text"
                className="bb-input min-h-56"
                defaultValue={defaultRules}
                required
              />
            </Field>
          </div>

          <button
            disabled={loading}
            className="rounded-2xl bg-lime-500 p-4 font-black text-black hover:bg-lime-400 disabled:bg-zinc-700 disabled:text-zinc-400 lg:col-span-2"
          >
            {loading ? "Създаване..." : "СЪЗДАЙ ИГРА"}
          </button>
        </form>
      </section>
    </AdminShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}
