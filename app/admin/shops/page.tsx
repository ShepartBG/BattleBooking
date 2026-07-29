"use client";

import BattleBookingLoader from "@/components/BattleBookingLoader";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { useFeedback } from "@/components/ui/FeedbackProvider";

type Item = {
  id: string;
  name: string;
  website_url?: string;
  logo_url?: string;
  cover_url?: string;
};

type FormState = {
  name: string;
  description: string;
  website_url: string;
  logo_url: string;
  cover_url: string;
  category: string;
  promo_code: string;
  address: string;
  phone: string;
  status: string;
  featured: boolean;
  paid_until: string;
  logo_x: number; logo_y: number; cover_x: number; cover_y: number;
};

const blank: FormState = {
  name: "",
  description: "",
  website_url: "",
  logo_url: "",
  cover_url: "",
  category: "Airsoft магазин",
  promo_code: "",
  address: "",
  phone: "",
  status: "active",
  featured: false,
  paid_until: "",
  logo_x: 50, logo_y: 50, cover_x: 50, cover_y: 50,
};

export default function Page() {
  const feedback = useFeedback();
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<FormState>(blank);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  async function token() {
    return (await supabase.auth.getSession()).data.session?.access_token || "";
  }

  async function load() {
    const response = await fetch("/api/admin/shops", {
      headers: { Authorization: `Bearer ${await token()}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) {
      feedback.error(result.message || "Грешка при зареждане.");
      setInitialLoading(false);
      return;
    }
    setItems(result.shops || []);
    setInitialLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function upload(file: File, kind: "logo" | "cover") {
    setUploading(kind);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("kind", kind === "logo" ? "shop-logo" : "shop-cover");

      const response = await fetch("/api/admin/owner-media", {
        method: "POST",
        headers: { Authorization: `Bearer ${await token()}` },
        body: data,
      });
      const result = await response.json();
      if (!response.ok) return feedback.error(result.message || "Грешка при качване.");
      setForm((current) => ({
        ...current,
        [kind === "logo" ? "logo_url" : "cover_url"]: result.publicUrl,
      }));
    } finally {
      setUploading(null);
    }
  }

  async function add() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/shops", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await token()}`,
        },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) return feedback.error(result.message || "Грешка при добавяне.");
      setForm(blank);
      await load();
      feedback.success("Магазинът е добавен успешно.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!(await feedback.confirmAction("Да изтрия ли магазина?"))) return;
    const response = await fetch("/api/admin/shops", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await token()}`,
      },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (!response.ok) return feedback.error(result.message || "Грешка при изтриване.");
    await load();
    feedback.success("Магазинът е изтрит.");
  }

  if (initialLoading) {
    return (
      <AdminShell active="shops">
        <BattleBookingLoader variant="section" title="ЗАРЕЖДАТ СЕ МАГАЗИНИТЕ..." subtitle="Подготвяме партньорите и техните данни" />
      </AdminShell>
    );
  }

  return (
    <AdminShell active="shops">
      <section className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-5 md:p-7">
        <h2 className="text-4xl font-black">Партньорски магазини</h2>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="grid gap-3">
            <Input label="Име" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <Input label="Сайт" value={form.website_url} onChange={(value) => setForm({ ...form, website_url: value })} />
            <UploadBox
              label="Лого"
              imageUrl={form.logo_url}
              uploading={uploading === "logo"}
              onFile={(file) => upload(file, "logo")}
              onRemove={() => setForm({ ...form, logo_url: "" })}
              positionX={form.logo_x} positionY={form.logo_y}
              onPosition={(logo_x, logo_y) => setForm({ ...form, logo_x, logo_y })}
            />
            <UploadBox
              label="Корица"
              imageUrl={form.cover_url}
              uploading={uploading === "cover"}
              onFile={(file) => upload(file, "cover")}
              onRemove={() => setForm({ ...form, cover_url: "" })}
              positionX={form.cover_x} positionY={form.cover_y}
              onPosition={(cover_x, cover_y) => setForm({ ...form, cover_x, cover_y })}
            />
            <Input label="Категория" value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
            <Input label="Промокод" value={form.promo_code} onChange={(value) => setForm({ ...form, promo_code: value })} />
            <Input label="Адрес" value={form.address} onChange={(value) => setForm({ ...form, address: value })} />
            <Input label="Телефон" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
            <Input label="Платено до" type="date" value={form.paid_until} onChange={(value) => setForm({ ...form, paid_until: value })} />
            <textarea className="bb-input min-h-28" placeholder="Описание" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <label className="flex gap-2">
              <input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} />
              Препоръчан партньор
            </label>
            <button disabled={saving || uploading !== null} onClick={add} className="rounded-2xl bg-lime-400 p-4 font-black text-black disabled:opacity-50">
              {saving ? "ДОБАВЯНЕ..." : "ДОБАВИ МАГАЗИН"}
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.04] p-4">
                <div className="flex items-center gap-3">
                  {item.logo_url ? <img src={item.logo_url} alt="" className="h-12 w-12 rounded-xl object-contain bg-white/5" /> : null}
                  <div>
                    <b>{item.name}</b>
                    <p className="text-sm text-zinc-500">{item.website_url}</p>
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

function UploadBox({ label, imageUrl, uploading, onFile, onRemove, positionX, positionY, onPosition }: { label: string; imageUrl: string; uploading: boolean; onFile: (file: File) => void; onRemove: () => void; positionX: number; positionY: number; onPosition: (x:number,y:number)=>void }) {
  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-black uppercase text-zinc-500">{label}</span>
        {imageUrl ? <button type="button" onClick={onRemove} className="text-sm text-red-300">Премахни</button> : null}
      </div>
      {imageUrl ? <img src={imageUrl} alt={label} className="mb-3 h-40 w-full rounded-xl object-cover" style={{ objectPosition: `${positionX}% ${positionY}%` }} /> : null}
      {imageUrl ? <div className="mb-3 grid gap-2"><label className="text-sm text-zinc-400">Хоризонтално: {positionX}%<input type="range" min="0" max="100" value={positionX} onChange={(e)=>onPosition(Number(e.target.value),positionY)} className="w-full"/></label><label className="text-sm text-zinc-400">Вертикално: {positionY}%<input type="range" min="0" max="100" value={positionY} onChange={(e)=>onPosition(positionX,Number(e.target.value))} className="w-full"/></label></div> : null}
      <label className="block cursor-pointer rounded-xl border border-dashed border-lime-400/40 p-4 text-center font-bold text-lime-300">
        {uploading ? "Качване..." : `Качи ${label.toLowerCase()}`}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
    </div>
  );
}
