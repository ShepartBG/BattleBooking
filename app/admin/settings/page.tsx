"use client";

import { useEffect, useRef, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import FieldLogoFrame from "@/components/brand/FieldLogoFrame";
import BattleBookingLogo from "@/components/brand/BattleBookingLogo";
import {
  DEFAULT_FIELD_SETTINGS,
  FIELD_SETTINGS_STORAGE_KEY,
  FieldSettings,
} from "@/lib/fieldConfig";
import { supabase } from "@/lib/supabase";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [logoEditorOpen, setLogoEditorOpen] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setLoading(false);
      showToast(
        "error",
        "Няма активна сесия",
        "Влез отново в профила си и пробвай пак.",
      );
      return;
    }

    const response = await fetch("/api/field-settings", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      setLoading(false);
      showToast(
        "error",
        "Не успях да заредя настройките",
        result.message || "Пробвай пак след малко.",
      );
      return;
    }

    let next = {
      ...DEFAULT_FIELD_SETTINGS,
      ...(result.settings as Partial<FieldSettings>),
    };

    const oldLocalSettings = window.localStorage.getItem(FIELD_SETTINGS_STORAGE_KEY);
    if (oldLocalSettings) {
      try {
        next = { ...next, ...(JSON.parse(oldLocalSettings) as Partial<FieldSettings>) };
        showToast(
          "success",
          "Открих стари локални настройки",
          "Прегледай ги и натисни Запази, за да се качат в профила и да се виждат от всички устройства.",
        );
      } catch {
        window.localStorage.removeItem(FIELD_SETTINGS_STORAGE_KEY);
      }
    }

    setSettings(next);
    setLogoPreview(next.logoUrl || DEFAULT_FIELD_SETTINGS.logoUrl);
    setBgPreview(next.backgroundUrl || DEFAULT_FIELD_SETTINGS.backgroundUrl);
    setLoading(false);
  }

  function showToast(
    type: "success" | "error",
    title: string,
    message: string,
  ) {
    setToast({ type, title, message });
    window.setTimeout(() => setToast(null), 3600);
  }

  function updateField(key: keyof FieldSettings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateNumberField(
    key: "logoScale" | "logoX" | "logoY",
    value: number,
  ) {
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
        setSettings((current) => ({
          ...current,
          logoUrl: imageData,
          logoFit: "contain",
          logoScale: 1,
          logoX: 0,
          logoY: 0,
        }));
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
      const compressedBackground = await compressImageSource(
        bgPreview,
        "background",
      );

      const nextSettings = {
        ...settings,
        logoUrl: compressedLogo,
        backgroundUrl: compressedBackground,
      };

      setSaving(true);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch("/api/field-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: nextSettings }),
      });
      const result = await response.json();
      setSaving(false);

      if (!response.ok || !result.ok) {
        showToast(
          "error",
          "Настройките не са запазени",
          result.message || "Пробвай пак след малко.",
        );
        return;
      }

      window.localStorage.removeItem(FIELD_SETTINGS_STORAGE_KEY);
      setSettings(nextSettings);
      setLogoPreview(compressedLogo);
      setBgPreview(compressedBackground);

      showToast(
        "success",
        "Запазено успешно",
        "Промените са приложени и ще се виждат на всички устройства.",
      );
    } catch {
      setSaving(false);
      showToast(
        "error",
        "Снимките са прекалено големи",
        "Пробвай с по-малки файлове или по-ниска резолюция.",
      );
    }
  }

  async function resetSettings() {
    setConfirmResetOpen(false);
    const nextSettings = DEFAULT_FIELD_SETTINGS;
    setSettings(nextSettings);
    setLogoPreview(nextSettings.logoUrl);
    setBgPreview(nextSettings.backgroundUrl);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const response = await fetch("/api/field-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ settings: nextSettings }),
    });

    if (response.ok) {
      showToast(
        "success",
        "Върнато по подразбиране",
        "Профилът използва стандартната визия на BattleBooking.",
      );
    } else {
      showToast(
        "error",
        "Не успях да върна настройките",
        "Пробвай пак след малко.",
      );
    }
  }

  return (
    <AdminShell active="settings">
      {toast && (
        <BattleBookingToast toast={toast} onClose={() => setToast(null)} />
      )}
      {confirmResetOpen && (
        <ConfirmResetModal
          onCancel={() => setConfirmResetOpen(false)}
          onConfirm={resetSettings}
        />
      )}
      {logoEditorOpen && (
        <LogoEditorModal
          logoPreview={logoPreview}
          name={settings.name}
          fit={settings.logoFit}
          scale={settings.logoScale}
          x={settings.logoX}
          y={settings.logoY}
          onFitChange={(value) => updateField("logoFit", value)}
          onScaleChange={(value) => updateNumberField("logoScale", value)}
          onXChange={(value) => updateNumberField("logoX", value)}
          onYChange={(value) => updateNumberField("logoY", value)}
          onClose={() => setLogoEditorOpen(false)}
        />
      )}
      <section className="space-y-5">
        {loading && (
          <div className="rounded-[2rem] border border-lime-400/15 bg-black/70 p-5 text-lime-200">
            Зареждане на настройките...
          </div>
        )}
        <div className="rounded-[2rem] border border-lime-400/15 bg-black/65 p-6 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
            Настройки
          </p>
          <h2 className="mt-2 text-4xl font-black">Настройки на игрището</h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Тук админът настройва визията на своето игрище: име, лого, фон,
            цени, телефон и социални мрежи.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <Panel title="Визия и информация">
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
                      label="Качи лого"
                      onChange={(file) => handleImagePreview("logo", file)}
                    />
                    <button
                      type="button"
                      onClick={() => setLogoEditorOpen(true)}
                      className="w-full rounded-2xl border border-lime-400/25 bg-black/45 px-4 py-3 font-black text-lime-200 transition hover:bg-lime-400 hover:text-black"
                    >
                      Изрежи и намести логото
                    </button>
                    <p className="text-xs leading-5 text-zinc-500">
                      Отвори редактора, хвани снимката с мишката или пръст и я намести в кръга.
                    </p>
                  </div>
                </div>
              </div>

              <UploadButton
                label="Качи фон / cover снимка"
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
                disabled={saving}
                className="rounded-2xl bg-lime-500 px-5 py-4 font-black text-black hover:bg-lime-400"
              >
                {saving ? "Запазване..." : "Запази настройките"}
              </button>
              <button
                onClick={() => setConfirmResetOpen(true)}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 font-black text-white hover:bg-white/[0.1]"
              >
                Върни по подразбиране
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/65 p-5 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-lime-300">
              Преглед на профила
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

function BattleBookingToast({
  toast,
  onClose,
}: {
  toast: { type: "success" | "error"; title: string; message: string };
  onClose: () => void;
}) {
  const isSuccess = toast.type === "success";

  return (
    <div className="fixed inset-x-3 top-24 z-[80] mx-auto max-w-md rounded-[1.6rem] border border-lime-400/25 bg-black/90 p-4 text-white shadow-[0_0_50px_rgba(149,201,0,.18)] backdrop-blur-2xl">
      <div className="flex items-start gap-3">
        <BattleBookingLogo variant="mark" showText={false} />
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-black ${isSuccess ? "text-lime-300" : "text-red-200"}`}
          >
            {isSuccess ? "✓ " : "! "}
            {toast.title}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            {toast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-zinc-300 hover:bg-white/20"
          aria-label="Затвори"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function LogoEditorModal({
  logoPreview,
  name,
  fit,
  scale,
  x,
  y,
  onFitChange,
  onScaleChange,
  onXChange,
  onYChange,
  onClose,
}: {
  logoPreview: string;
  name: string;
  fit: "contain" | "cover";
  scale: number;
  x: number;
  y: number;
  onFitChange: (value: "contain" | "cover") => void;
  onScaleChange: (value: number) => void;
  onXChange: (value: number) => void;
  onYChange: (value: number) => void;
  onClose: () => void;
}) {
  const dragRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
  }>({
    active: false,
    startClientX: 0,
    startClientY: 0,
    startX: x,
    startY: y,
  });

  const safeScale = Number.isFinite(scale) ? Math.min(Math.max(scale, 0.6), 3) : 1;
  const safeX = Number.isFinite(x) ? Math.min(Math.max(x, -70), 70) : 0;
  const safeY = Number.isFinite(y) ? Math.min(Math.max(y, -70), 70) : 0;

  function startDrag(clientX: number, clientY: number) {
    dragRef.current = {
      active: true,
      startClientX: clientX,
      startClientY: clientY,
      startX: safeX,
      startY: safeY,
    };
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragRef.current.active) return;

    const dx = clientX - dragRef.current.startClientX;
    const dy = clientY - dragRef.current.startClientY;
    const nextX = Math.min(Math.max(dragRef.current.startX + dx / 2.2, -70), 70);
    const nextY = Math.min(Math.max(dragRef.current.startY + dy / 2.2, -70), 70);

    onXChange(Math.round(nextX));
    onYChange(Math.round(nextY));
  }

  function stopDrag() {
    dragRef.current.active = false;
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseMove={(event) => moveDrag(event.clientX, event.clientY)}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        if (touch) moveDrag(touch.clientX, touch.clientY);
      }}
      onTouchEnd={stopDrag}
    >
      <div className="w-full max-w-4xl rounded-[2rem] border border-lime-400/20 bg-[#050805] p-5 text-white shadow-[0_0_70px_rgba(149,201,0,.18)] sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-lime-300">
              Лого
            </p>
            <h3 className="mt-1 text-2xl font-black">Изрежи и намести логото</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Хвани самата снимка и я премести в кръга. С плъзгача отдолу настрой zoom-а.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-2xl text-zinc-300 hover:bg-white/20"
            aria-label="Затвори"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr] lg:items-center">
          <div className="mx-auto rounded-[2rem] border border-lime-400/20 bg-[radial-gradient(circle_at_top,rgba(149,201,0,.18),transparent_45%),rgba(255,255,255,.04)] p-8">
            <div
              className="relative h-72 w-72 cursor-grab touch-none overflow-hidden rounded-full border-2 border-lime-400/45 bg-black/70 shadow-[0_0_55px_rgba(149,201,0,.16)] active:cursor-grabbing"
              onMouseDown={(event) => startDrag(event.clientX, event.clientY)}
              onTouchStart={(event) => {
                const touch = event.touches[0];
                if (touch) startDrag(touch.clientX, touch.clientY);
              }}
            >
              <div className="pointer-events-none absolute inset-0 z-20 rounded-full ring-4 ring-black/50" />
              <div className="pointer-events-none absolute left-1/2 top-0 z-20 h-full w-px -translate-x-1/2 bg-white/10" />
              <div className="pointer-events-none absolute left-0 top-1/2 z-20 h-px w-full -translate-y-1/2 bg-white/10" />
              <img
                src={logoPreview}
                alt={name}
                draggable={false}
                className={`relative z-10 h-full w-full select-none ${fit === "cover" ? "object-cover" : "object-contain"}`}
                style={{
                  transform: `translate(${safeX}%, ${safeY}%) scale(${safeScale})`,
                  transformOrigin: "center",
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onFitChange("contain")}
                className={`rounded-2xl border px-4 py-3 font-black ${fit === "contain" ? "border-lime-400 bg-lime-400 text-black" : "border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.1]"}`}
              >
                Побери цялото лого
              </button>
              <button
                type="button"
                onClick={() => onFitChange("cover")}
                className={`rounded-2xl border px-4 py-3 font-black ${fit === "cover" ? "border-lime-400 bg-lime-400 text-black" : "border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.1]"}`}
              >
                Запълни кръга
              </button>
            </div>

            <RangeInput
              label="Zoom"
              min={0.6}
              max={3}
              step={0.05}
              value={safeScale}
              onChange={onScaleChange}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  onScaleChange(1);
                  onXChange(0);
                  onYChange(0);
                  onFitChange("contain");
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 font-black text-white hover:bg-white/[0.1]"
              >
                Центрирай
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-lime-500 px-5 py-4 font-black text-black hover:bg-lime-400"
              >
                Готово
              </button>
            </div>

            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-zinc-400">
              След „Готово“ натисни „Запази настройките“, за да се вижда логото правилно и за гостите, и на телефона.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmResetModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/72 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-lime-400/20 bg-[#050805] p-6 text-white shadow-[0_0_60px_rgba(149,201,0,.16)]">
        <BattleBookingLogo />
        <h3 className="mt-5 text-2xl font-black">Връщане по подразбиране?</h3>
        <p className="mt-3 leading-7 text-zinc-300">
          Това ще върне стандартното име, лого, фон и описание на BattleBooking.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 font-black text-white hover:bg-white/[0.12]"
          >
            Отказ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-2xl bg-lime-500 px-4 py-3 font-black text-black hover:bg-lime-400"
          >
            Потвърждавам
          </button>
        </div>
      </div>
    </div>
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
      {help && (
        <span className="mt-2 block text-xs font-bold text-lime-300/80">
          {help}
        </span>
      )}
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
