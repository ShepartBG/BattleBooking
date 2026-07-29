"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";

type Item = { id: string; title: string; start_date?: string; city?: string; cover_url?: string };
type FormState = {
  title: string;
  cover_url: string;
  short_description: string;
  description: string;
  event_type: string;
  country: string;
  city: string;
  location: string;
  start_date: string;
  end_date: string;
  registration_url: string;
  website_url: string;
  facebook_url: string;
  organizer_name: string;
  price_text: string;
  featured: boolean;
  status: string;
  cover_x: number;
  cover_y: number;
};

const blank: FormState = {
  title: "",
  cover_url: "",
  short_description: "",
  description: "",
  event_type: "milsim",
  country: "България",
  city: "",
  location: "",
  start_date: "",
  end_date: "",
  registration_url: "",
  website_url: "",
  facebook_url: "",
  organizer_name: "",
  price_text: "",
  featured: false,
  status: "active",
  cover_x: 50,
  cover_y: 50,
};

export default function Page() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<FormState>(blank);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function token() {
    return (await supabase.auth.getSession()).data.session?.access_token || "";
  }

  async function load() {
    const response = await fetch("/api/admin/events", {
      headers: { Authorization: `Bearer ${await token()}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) return alert(result.message || "Грешка при зареждане.");
    setItems(result.events || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function upload(file: File) {
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("kind", "event-cover");
      const response = await fetch("/api/admin/owner-media", {
        method: "POST",
        headers: { Authorization: `Bearer ${await token()}` },
        body: data,
      });
      const result = await response.json();
      if (!response.ok) return alert(result.message || "Грешка при качване.");
      setForm((current) => ({ ...current, cover_url: result.publicUrl }));
    } finally {
      setUploading(false);
    }
  }

  async function add() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await token()}`,
        },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) return alert(result.message || "Грешка при добавяне.");
      setForm(blank);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Да изтрия ли събитието?")) return;
    const response = await fetch("/api/admin/events", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await token()}`,
      },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (!response.ok) return alert(result.message || "Грешка при изтриване.");
    await load();
  }

  return (
    <AdminShell active="events">
      <section className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-5 md:p-7">
        <h2 className="text-4xl font-black">Събития</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Име" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
            <Input label="Тип" value={form.event_type} onChange={(value) => setForm({ ...form, event_type: value })} />
            <Input label="Начална дата" type="date" value={form.start_date} onChange={(value) => setForm({ ...form, start_date: value })} />
            <Input label="Крайна дата" type="date" value={form.end_date} onChange={(value) => setForm({ ...form, end_date: value })} />
            <Input label="Град" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
            <Input label="Локация" value={form.location} onChange={(value) => setForm({ ...form, location: value })} />
            <Input label="Организатор" value={form.organizer_name} onChange={(value) => setForm({ ...form, organizer_name: value })} />
            <Input label="Цена" value={form.price_text} onChange={(value) => setForm({ ...form, price_text: value })} />
            <Input label="Линк за записване" value={form.registration_url} onChange={(value) => setForm({ ...form, registration_url: value })} />
            <Input label="Сайт" value={form.website_url} onChange={(value) => setForm({ ...form, website_url: value })} />
            <Input label="Facebook" value={form.facebook_url} onChange={(value) => setForm({ ...form, facebook_url: value })} />
            <div className="md:col-span-2 rounded-2xl border border-white/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-zinc-500">Корица</span>
                {form.cover_url ? <button type="button" onClick={() => setForm({ ...form, cover_url: "" })} className="text-sm text-red-300">Премахни</button> : null}
              </div>
              {form.cover_url ? <img src={form.cover_url} alt="Корица" className="mb-3 h-48 w-full rounded-xl object-cover" style={{ objectPosition: `${form.cover_x}% ${form.cover_y}%` }} /> : null}
              <label className="block cursor-pointer rounded-xl border border-dashed border-lime-400/40 p-4 text-center font-bold text-lime-300">
                {uploading ? "Качване..." : "Качи корица"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) upload(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {form.cover_url ? <PositionControls x={form.cover_x} y={form.cover_y} onChange={(cover_x, cover_y) => setForm({ ...form, cover_x, cover_y })} /> : null}
            </div>
            <textarea className="bb-input min-h-24 md:col-span-2" placeholder="Кратко описание" value={form.short_description} onChange={(event) => setForm({ ...form, short_description: event.target.value })} />
            <textarea className="bb-input min-h-36 md:col-span-2" placeholder="Подробно описание" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <label className="flex gap-2">
              <input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} />
              Препоръчано
            </label>
            <button disabled={saving || uploading} onClick={add} className="rounded-2xl bg-lime-400 p-4 font-black text-black md:col-span-2 disabled:opacity-50">
              {saving ? "ДОБАВЯНЕ..." : "ДОБАВИ СЪБИТИЕ"}
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.04] p-4">
                <div className="flex items-center gap-3">
                  {item.cover_url ? <img src={item.cover_url} alt="" className="h-12 w-16 rounded-xl object-cover" /> : null}
                  <div>
                    <b>{item.title}</b>
                    <p className="text-sm text-zinc-500">{item.start_date} · {item.city}</p>
                  </div>
                </div>
                <button onClick={() => remove(item.id)} className="text-red-300">Изтрий</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-black uppercase text-zinc-500">{label}</span>
      <input type={type} className="bb-input" value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function PositionControls({ x, y, onChange }: { x: number; y: number; onChange: (x: number, y: number) => void }) {
  return <div className="mt-3 grid gap-2"><label className="text-sm text-zinc-400">Хоризонтално: {x}%<input type="range" min="0" max="100" value={x} onChange={(e)=>onChange(Number(e.target.value),y)} className="w-full"/></label><label className="text-sm text-zinc-400">Вертикално: {y}%<input type="range" min="0" max="100" value={y} onChange={(e)=>onChange(x,Number(e.target.value))} className="w-full"/></label></div>;
}
