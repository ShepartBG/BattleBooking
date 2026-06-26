"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import FieldLogoFrame from "@/components/brand/FieldLogoFrame";
import {
  DEFAULT_FIELD_SETTINGS,
  FIELD_SETTINGS_STORAGE_KEY,
  FieldSettings,
} from "@/lib/fieldConfig";

export default function SettingsPage() {
  const [settings, setSettings] = useState<FieldSettings>(
    DEFAULT_FIELD_SETTINGS,
  );
  const [logoPreview, setLogoPreview] = useState(
    DEFAULT_FIELD_SETTINGS.logoUrl,
  );
  const [bgPreview, setBgPreview] = useState(
    DEFAULT_FIELD_SETTINGS.backgroundUrl,
  );

  useEffect(() => {
    const saved = localStorage.getItem(FIELD_SETTINGS_STORAGE_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as Partial<FieldSettings>;
      const next = { ...DEFAULT_FIELD_SETTINGS, ...parsed };
      setSettings(next);
      setLogoPreview(next.logoUrl || DEFAULT_FIELD_SETTINGS.logoUrl);
      setBgPreview(next.backgroundUrl || DEFAULT_FIELD_SETTINGS.backgroundUrl);
    } catch {
      localStorage.removeItem(FIELD_SETTINGS_STORAGE_KEY);
    }
  }, []);

  function updateField(key: keyof FieldSettings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateNumberField(key: "logoScale" | "logoX" | "logoY", value: number) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function handleImagePreview(type: "logo" | "background", file?: File) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = String(reader.result || "");
      if (!imageData) return;

      if (type === "logo") {
        setLogoPreview(imageData);
        updateField("logoUrl", imageData);
      } else {
        setBgPreview(imageData);
        updateField("backgroundUrl", imageData);
      }
    };
    reader.readAsDataURL(file);
  }

  async function saveSettings() {
    try {
      const compressedLogo = await compressImageSource(logoPreview, "logo");
      const compressedBackground = await compressImageSource(bgPreview, "background");

      const nextSettings = {
        ...settings,
        logoUrl: compressedLogo,
        backgroundUrl: compressedBackground,
      };

      localStorage.setItem(
        FIELD_SETTINGS_STORAGE_KEY,
        JSON.stringify(nextSettings),
      );

      setSettings(nextSettings);
      setLogoPreview(compressedLogo);
      setBgPreview(compressedBackground);

      alert("Настройките са запазени успешно.");
    } catch {
      alert(
        "Снимките са прекалено големи за локално запазване. Пробвай с по-малки файлове.",
      );
    }
  }

  function resetSettings() {
    const confirmed = confirm("Да върна ли настройките по подразбиране?");
    if (!confirmed) return;
    localStorage.removeItem(FIELD_SETTINGS_STORAGE_KEY);
    setSettings(DEFAULT_FIELD_SETTINGS);
    setLogoPreview(DEFAULT_FIELD_SETTINGS.logoUrl);
    setBgPreview(DEFAULT_FIELD_SETTINGS.backgroundUrl);
  }

  return (
    <AdminShell active="settings">
      <section className="space-y-5">
        <div className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-6 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
            Organizer Settings
          </p>
          <h2 className="mt-2 text-4xl font-black">Настройки на игрището</h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Тук админът настройва визията на своето игрище: име, лого, фон,
            цени, телефон и социални мрежи.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <Panel title="Branding">
              <TextInput
                label="Име на игрището"
                value={settings.name}
                maxLength={80}
                onChange={(value) => updateField("name", value)}
              />
              <TextInput
                label="Кратко име на игрището (URL slug)"
                value={settings.slug}
                maxLength={40}
                onChange={(value) =>
                  updateField(
                    "slug",
                    value
                      .toLowerCase()
                      .replace(/[^a-z0-9\-\s]/g, "")
                      .replace(/\s+/g, "-"),
                  )
                }
                placeholder="warzone"
                help={`Използва се за публичния адрес на игрището. Пример: battlebooking.bg/field/${settings.slug || "warzone"}`}
              />
              <TextInput
                label="Област"
                value={settings.region}
                maxLength={60}
                onChange={(value) => updateField("region", value)}
              />
              <TextInput
                label="Населено място"
                value={settings.settlement}
                maxLength={60}
                onChange={(value) => updateField("settlement", value)}
              />
              <TextInput
                label="Пълна локация"
                value={settings.location}
                maxLength={120}
                onChange={(value) => updateField("location", value)}
              />
              <TextArea
                label="Описание"
                value={settings.description}
                maxLength={500}
                onChange={(value) => updateField("description", value)}
              />

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                  Лого на игрището
                </p>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <FieldLogoFrame
                    src={logoPreview}
                    alt={settings.name}
                    size="md"
                    fit={settings.logoFit}
                    scale={settings.logoScale}
                    x={settings.logoX}
                    y={settings.logoY}
                  />
                  <div className="flex-1 space-y-3">
                    <UploadButton
                      label="Качи logo на игрището"
                      onChange={(file) => handleImagePreview("logo", file)}
                    />
                    <select
                      className="bb-input"
                      value={settings.logoFit}
                      onChange={(e) => updateField("logoFit", e.target.value as "contain" | "cover")}
                    >
                      <option value="contain">Побери цялото лого</option>
                      <option value="cover">Запълни кръга</option>
                    </select>
                    <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/35 p-3">
                      <RangeInput
                        label="Размер / zoom"
                        min={0.7}
                        max={2.2}
                        step={0.05}
                        value={settings.logoScale}
                        onChange={(value) => updateNumberField("logoScale", value)}
                      />
                      <RangeInput
                        label="Наляво / надясно"
                        min={-45}
                        max={45}
                        step={1}
                        value={settings.logoX}
                        onChange={(value) => updateNumberField("logoX", value)}
                      />
                      <RangeInput
                        label="Нагоре / надолу"
                        min={-45}
                        max={45}
                        step={1}
                        value={settings.logoY}
                        onChange={(value) => updateNumberField("logoY", value)}
                      />
                    </div>
                    <p className="text-xs leading-5 text-zinc-500">
                      Логото ще се показва кръгло. Използвай настройките за
                      zoom и позиция, за да го наместиш ръчно в кръга.
                    </p>
                  </div>
                </div>
              </div>

              <UploadButton
                label="Качи тема / background"
                onChange={(file) => handleImagePreview("background", file)}
              />
            </Panel>

            <Panel title="Цени, телефон и социални мрежи">
              <TextInput
                label="Такса със собствено оборудване"
                value={settings.ownPrice}
                maxLength={20}
                onChange={(value) => updateField("ownPrice", value)}
              />
              <TextInput
                label="Такса с комплект под наем"
                value={settings.rentalPrice}
                maxLength={20}
                onChange={(value) => updateField("rentalPrice", value)}
              />
              <TextInput
                label="Телефон"
                value={settings.phone}
                maxLength={20}
                onChange={(value) => updateField("phone", value)}
              />
              <TextInput
                label="Facebook URL"
                value={settings.facebook}
                maxLength={180}
                onChange={(value) => updateField("facebook", value)}
              />
              <TextInput
                label="Instagram URL"
                value={settings.instagram}
                maxLength={180}
                onChange={(value) => updateField("instagram", value)}
              />
              <TextInput
                label="TikTok URL"
                value={settings.tiktok}
                maxLength={180}
                onChange={(value) => updateField("tiktok", value)}
              />
            </Panel>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={saveSettings}
                className="rounded-2xl bg-lime-500 px-5 py-4 font-black text-black hover:bg-lime-400"
              >
                Запази настройките
              </button>
              <button
                onClick={resetSettings}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 font-black text-white hover:bg-white/[0.1]"
              >
                Върни по подразбиране
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/65 p-5 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-lime-300">
              Live Preview
            </p>
            <div
              className="mt-5 overflow-hidden rounded-[2rem] border border-lime-400/20 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.86),rgba(0,0,0,.42),rgba(0,0,0,.82)), url('${bgPreview}')`,
              }}
            >
              <div className="flex min-h-[420px] flex-col justify-end p-6">
                <FieldLogoFrame
                  src={logoPreview}
                  alt={settings.name}
                  size="lg"
                  fit={settings.logoFit}
                  scale={settings.logoScale}
                  x={settings.logoX}
                  y={settings.logoY}
                />
                <h3 className="mt-5 text-5xl font-black uppercase leading-none">
                  {settings.name}
                </h3>
                <p className="mt-3 text-lime-200">📍 {settings.location}</p>
                <p className="mt-4 max-w-xl leading-7 text-zinc-300">
                  {settings.description}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Mini label="Собствено" value={settings.ownPrice} />
                  <Mini label="Под наем" value={settings.rentalPrice} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function compressImageSource(src: string, type: "logo" | "background") {
  if (!src || src.startsWith("/") || src.startsWith("http")) return src;
  if (!src.startsWith("data:image")) return src;

  const img = await loadImage(src);
  const maxSize = type === "logo" ? 520 : 1400;
  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;

  if (type === "background") {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(img, 0, 0, width, height);

  const result =
    type === "logo"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", 0.76);

  if (result.length > (type === "logo" ? 900_000 : 1_500_000)) {
    throw new Error("Image is still too large after compression.");
  }

  return result;
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-black/65 p-5 backdrop-blur-xl">
      <h3 className="text-2xl font-black text-lime-300">{title}</h3>
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  help,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <input
        className="bb-input"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      {help && <span className="mt-2 block text-xs font-bold text-lime-300/80">{help}</span>}
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </span>
      <textarea
        className="bb-input min-h-28"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
      />
      {maxLength && (
        <span className="mt-2 block text-right text-xs font-bold text-zinc-500">
          {value.length}/{maxLength}
        </span>
      )}
    </label>
  );
}

function RangeInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
        <span>{label}</span>
        <span className="text-lime-300">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-lime-400"
      />
    </label>
  );
}

function UploadButton({
  label,
  onChange,
}: {
  label: string;
  onChange: (file?: File) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-2xl border border-lime-400/25 bg-lime-400/10 p-4 text-center font-black text-lime-200 transition hover:bg-lime-400 hover:text-black">
      {label}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0])}
      />
    </label>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/55 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value || "—"}</p>
    </div>
  );
}
