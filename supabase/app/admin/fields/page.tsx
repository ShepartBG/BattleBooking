"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";

type Field = {
  id: string;
  field_name: string;
  public_location?: string;
  public_settlement?: string;
  public_region?: string;
  public_description?: string;
  default_max_rental_sets?: number;
  default_rules_text?: string;
  default_game_description?: string;
  logo_url?: string;
  background_url?: string;
  logo_x?: number; logo_y?: number; background_x?: number; background_y?: number;
};

type FieldForm = Omit<Field, "id"> & { id?: string };

const blank: FieldForm = {
  field_name: "",
  public_settlement: "",
  public_region: "",
  public_location: "",
  public_description: "",
  default_max_rental_sets: 0,
  default_rules_text: "",
  default_game_description: "",
  logo_url: "",
  background_url: "",
  logo_x: 0, logo_y: 0, background_x: 50, background_y: 50,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;


export default function FieldsAdmin() {
  const [fields, setFields] = useState<Field[]>([]);
  const [form, setForm] = useState<FieldForm>(blank);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const logoPreview = useMemo(
    () => (logoFile ? URL.createObjectURL(logoFile) : form.logo_url || ""),
    [logoFile, form.logo_url],
  );
  const backgroundPreview = useMemo(
    () =>
      backgroundFile
        ? URL.createObjectURL(backgroundFile)
        : form.background_url || "",
    [backgroundFile, form.background_url],
  );

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
      if (backgroundPreview.startsWith("blob:")) {
        URL.revokeObjectURL(backgroundPreview);
      }
    };
  }, [logoPreview, backgroundPreview]);

  async function token() {
    return (await supabase.auth.getSession()).data.session?.access_token || "";
  }

  async function load() {
    const t = await token();
    const response = await fetch("/api/admin/fields", {
      headers: { Authorization: `Bearer ${t}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) return alert(result.message || "Грешка при зареждане.");
    setFields(result.fields || []);
  }

  useEffect(() => {
    void load();
  }, []);

  function selectField(field: FieldForm) {
    setForm({ ...blank, ...field });
    setLogoFile(null);
    setBackgroundFile(null);
  }

  function validateFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Можеш да качваш само снимки.");
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert("Снимката трябва да бъде до 10 MB.");
      return false;
    }
    return true;
  }

  async function uploadProfileImage(
    fieldId: string,
    kind: "logo" | "background",
    file: File,
    accessToken: string,
  ) {
    const uploadForm = new FormData();
    uploadForm.append("file", file);
    uploadForm.append("field_id", fieldId);
    uploadForm.append("kind", kind);

    const response = await fetch("/api/admin/media", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: uploadForm,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Снимката не беше качена.");
    return String(result.publicUrl || "");
  }

  async function save() {
    if (!form.field_name.trim()) return alert("Въведи име на игрището.");

    setLoading(true);
    try {
      const t = await token();
      const method = form.id ? "PUT" : "POST";
      const response = await fetch("/api/admin/fields", {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Грешка при запазване.");

      const savedField: Field = result.field;
      const imageUpdate: Partial<Field> & { id: string } = { id: savedField.id };

      if (logoFile) {
        imageUpdate.logo_url = await uploadProfileImage(
          savedField.id,
          "logo",
          logoFile,
          t,
        );
      }
      if (backgroundFile) {
        imageUpdate.background_url = await uploadProfileImage(
          savedField.id,
          "background",
          backgroundFile,
          t,
        );
      }

      if (imageUpdate.logo_url || imageUpdate.background_url) {
        const imageResponse = await fetch("/api/admin/fields", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${t}`,
          },
          body: JSON.stringify(imageUpdate),
        });
        const imageResult = await imageResponse.json();
        if (!imageResponse.ok) {
          throw new Error(imageResult.message || "Снимките не бяха записани.");
        }
      }

      setForm(blank);
      setLogoFile(null);
      setBackgroundFile(null);
      await load();
      alert("Игрището е запазено успешно.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Неочаквана грешка.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteField(field: Field) {
    if (!confirm(`Сигурен ли си, че искаш да изтриеш „${field.field_name}“? Игри, регистрации и снимки към него също ще бъдат изтрити.`)) return;

    setLoading(true);
    try {
      const t = await token();
      const response = await fetch("/api/admin/fields", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ id: field.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Игрището не беше изтрито.");

      if (form.id === field.id) {
        setForm(blank);
        setLogoFile(null);
        setBackgroundFile(null);
      }
      await load();
      alert("Игрището е изтрито.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Неочаквана грешка.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell active="fields">
      <section className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-5 md:p-7">
        <h2 className="text-4xl font-black">Моите игрища</h2>
        <p className="mt-2 text-zinc-400">
          Добави всички терени, които управляваш. После ги избираш при
          създаване на игра.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-3">
            {fields.map((field) => (
              <div
                key={field.id}
                className="rounded-2xl border border-white/10 bg-white/[.04] p-3"
              >
                <button
                  type="button"
                  onClick={() => selectField(field)}
                  className="w-full p-1 text-left hover:text-lime-300"
                >
                  <b>{field.field_name}</b>
                  <p className="mt-1 text-sm text-zinc-500">
                    {field.public_location ||
                      [field.public_settlement, field.public_region]
                        .filter(Boolean)
                        .join(", ")}
                  </p>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void deleteField(field)}
                  className="mt-3 w-full rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-black text-red-200 disabled:opacity-50"
                >
                  ИЗТРИЙ ИГРИЩЕТО
                </button>
              </div>
            ))}
            <button
              onClick={() => selectField(blank)}
              className="w-full rounded-2xl border border-dashed border-lime-400/40 p-4 font-black text-lime-300"
            >
              + Добави ново игрище
            </button>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 md:grid-cols-2">
            <Input
              label="Име"
              value={form.field_name || ""}
              onChange={(value) => setForm({ ...form, field_name: value })}
            />
            <Input
              label="Населено място"
              value={form.public_settlement || ""}
              onChange={(value) =>
                setForm({ ...form, public_settlement: value })
              }
            />
            <Input
              label="Област"
              value={form.public_region || ""}
              onChange={(value) => setForm({ ...form, public_region: value })}
            />
            <Input
              label="Точна локация"
              value={form.public_location || ""}
              onChange={(value) =>
                setForm({ ...form, public_location: value })
              }
            />

            <ImageUpload
              label="Лого"
              preview={logoPreview}
              buttonText="Качи лого"
              onFile={(file) => validateFile(file) && setLogoFile(file)}
              onRemove={() => { setLogoFile(null); setForm({ ...form, logo_url: "" }); }}
              positionX={50 + (form.logo_x || 0)} positionY={50 + (form.logo_y || 0)}
              onPosition={(x,y)=>setForm({...form,logo_x:x-50,logo_y:y-50})}
            />
            <ImageUpload
              label="Фон / корица"
              preview={backgroundPreview}
              buttonText="Качи фон"
              wide
              onFile={(file) => validateFile(file) && setBackgroundFile(file)}
              onRemove={() => { setBackgroundFile(null); setForm({ ...form, background_url: "" }); }}
              positionX={form.background_x ?? 50} positionY={form.background_y ?? 50}
              onPosition={(background_x,background_y)=>setForm({...form,background_x,background_y})}
            />

            <Input
              label="Комплекти по подразбиране"
              type="number"
              value={String(form.default_max_rental_sets || 0)}
              onChange={(value) =>
                setForm({
                  ...form,
                  default_max_rental_sets: Math.max(0, Number(value)),
                })
              }
            />
            <div />
            <Area
              label="Описание на игрището"
              value={form.public_description || ""}
              onChange={(value) =>
                setForm({ ...form, public_description: value })
              }
            />
            <Area
              label="Описание за нова игра"
              value={form.default_game_description || ""}
              onChange={(value) =>
                setForm({ ...form, default_game_description: value })
              }
            />
            <div className="md:col-span-2">
              <Area
                label="Правила по подразбиране"
                value={form.default_rules_text || ""}
                onChange={(value) =>
                  setForm({ ...form, default_rules_text: value })
                }
              />
            </div>
            <button
              disabled={loading}
              onClick={save}
              className="rounded-2xl bg-lime-400 p-4 font-black text-black disabled:opacity-60 md:col-span-2"
            >
              {loading
                ? "Запазване..."
                : form.id
                  ? "ЗАПАЗИ ИГРИЩЕТО"
                  : "ДОБАВИ ИГРИЩЕ"}
            </button>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function ImageUpload({
  label,
  preview,
  buttonText,
  onFile,
  onRemove,
  wide = false,
  positionX, positionY, onPosition,
}: {
  label: string;
  preview: string;
  buttonText: string;
  onFile: (file: File) => void;
  onRemove: () => void;
  wide?: boolean;
  positionX: number; positionY: number; onPosition: (x:number,y:number)=>void;
}) {
  return (
    <div>
      <span className="mb-2 block text-xs font-black uppercase tracking-[.18em] text-zinc-500">
        {label}
      </span>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        {preview ? (
          <img
            src={preview}
            alt={label}
            className={`${wide ? "h-36" : "h-36"} w-full ${wide ? "object-cover" : "object-contain"}`}
            style={{ objectPosition: `${positionX}% ${positionY}%` }}
          />
        ) : (
          <div className="flex h-36 items-center justify-center text-sm text-zinc-600">
            Няма качена снимка
          </div>
        )}
        {preview ? <div className="grid gap-2 px-3 pt-3"><label className="text-xs text-zinc-400">Хоризонтално: {Math.round(positionX)}%<input type="range" min="0" max="100" value={positionX} onChange={(e)=>onPosition(Number(e.target.value),positionY)} className="w-full"/></label><label className="text-xs text-zinc-400">Вертикално: {Math.round(positionY)}%<input type="range" min="0" max="100" value={positionY} onChange={(e)=>onPosition(positionX,Number(e.target.value))} className="w-full"/></label></div> : null}
        <div className="grid grid-cols-2 gap-2 p-2">
          <label className="cursor-pointer rounded-xl bg-lime-400 px-3 py-2 text-center text-sm font-black text-black">
            {buttonText}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onFile(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={onRemove}
            disabled={!preview}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm font-black text-zinc-300 disabled:opacity-30"
          >
            Премахни
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase tracking-[.18em] text-zinc-500">
        {label}
      </span>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        className="bb-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase tracking-[.18em] text-zinc-500">
        {label}
      </span>
      <textarea
        className="bb-input min-h-28"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

