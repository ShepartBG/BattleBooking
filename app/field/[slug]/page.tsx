"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PublicShell from "@/components/public/PublicShell";
import GameCard from "@/components/public/GameCard";
import LoadingScreen from "@/components/LoadingScreen";
import FieldLogoFrame from "@/components/brand/FieldLogoFrame";
import { DEFAULT_FIELD_SETTINGS, FieldSettings } from "@/lib/fieldConfig";

type Game = {
  id: string;
  title: string;
  game_date: string;
  game_time: string;
  location: string;
  max_rental_sets: number;
  status: string;
  description?: string | null;
  registered_count?: number;
};

export default function FieldPage() {
  const params = useParams<{ slug: string }>();
  const rawSlug = String(params?.slug || "");

  let slug = rawSlug;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    slug = rawSlug;
  }
  const [games, setGames] = useState<Game[]>([]);
  const [images, setImages] = useState<{ id: string; image_url: string; caption?: string; position_x?: number; position_y?: number }[]>([]);
  const [organizerFields, setOrganizerFields] = useState<any[]>([]);
  const [fieldSettings, setFieldSettings] = useState<FieldSettings>(DEFAULT_FIELD_SETTINGS);
  const [loadingField, setLoadingField] = useState(true);

  useEffect(() => {
    async function loadField() {
      setLoadingField(true);

      try {
        const response = await fetch(`/api/public-fields?slug=${encodeURIComponent(slug)}&include_games=1`);
        const result = await response.json();

        if (!response.ok || !result.ok) {
          console.error("Field load error:", result.message);
          setLoadingField(false);
          return;
        }

        if (result.field) {
          setFieldSettings({
            ...DEFAULT_FIELD_SETTINGS,
            ...result.field,
          });
          setGames(Array.isArray(result.games) ? result.games : []);
          setImages(Array.isArray(result.images) ? result.images : []);
          setOrganizerFields(
            Array.isArray(result.organizerFields) && result.organizerFields.length
              ? result.organizerFields
              : result.field
                ? [result.field]
                : [],
          );
        } else {
          setGames([]);
        }
      } catch (error) {
        console.error("Field load error:", error);
      } finally {
        setLoadingField(false);
      }
    }

    if (slug) loadField();
  }, [slug]);



  if (loadingField) {
    return (
      <PublicShell>
        <LoadingScreen title="Зареждане..." subtitle="Отваряме страницата на игрището" />
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="overflow-hidden rounded-[2.6rem] border border-[#95c900]/22 bg-black/60 backdrop-blur-xl">
          <div
            className="relative min-h-[360px] bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(90deg,rgba(0,0,0,.88),rgba(0,0,0,.45),rgba(0,0,0,.78)), url('${fieldSettings.backgroundUrl}')`,
              backgroundPosition: `${(fieldSettings as any).backgroundX ?? 50}% ${(fieldSettings as any).backgroundY ?? 50}%`,
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(149,201,0,.22),transparent_38%)]" />

            <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-6 md:p-10">
              <FieldLogoFrame
                src={fieldSettings.logoUrl}
                alt={fieldSettings.name}
                size="lg"
                fit={fieldSettings.logoFit}
                scale={fieldSettings.logoScale}
                x={fieldSettings.logoX}
                y={fieldSettings.logoY}
                className="mb-6"
              />

              <p className="w-fit rounded-full border border-[#95c900]/35 bg-[#95c900]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#b7ef16]">
                Проверено игрище
              </p>

              <h1 className="mt-4 max-w-4xl text-5xl font-black uppercase leading-[0.94] tracking-tight md:text-7xl">
                {fieldSettings.name}
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300">
                {fieldSettings.description}
              </p>
            </div>
          </div>
        </div>

        {organizerFields.length > 1 && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-black/70 p-6 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300">Игрища на организатора</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <h2 className="text-3xl font-black">Избери игрище</h2>
              <span className="text-sm font-bold text-zinc-500">{organizerFields.length} игрища</span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {organizerFields.map((field: any) => {
                const isCurrent = String(field.id) === String((fieldSettings as any).id);
                return (
                  <a
                    key={field.id}
                    href={`/field/${encodeURIComponent(field.slug)}`}
                    className={`group overflow-hidden rounded-2xl border bg-white/[0.04] transition ${
                      isCurrent
                        ? "border-lime-400/70 ring-1 ring-lime-400/30"
                        : "border-white/10 hover:border-lime-400/40"
                    }`}
                  >
                    <div
                      className="relative h-44 bg-cover"
                      style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,.12),rgba(0,0,0,.86)),url('${field.backgroundUrl || "/battlebooking-bg.jpg"}')`,
                        backgroundPosition: `${field.backgroundX ?? 50}% ${field.backgroundY ?? 50}%`,
                      }}
                    >
                      {isCurrent && (
                        <span className="absolute right-3 top-3 rounded-full bg-lime-400 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-black">
                          Отворено
                        </span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <h3 className="text-xl font-black text-white">{field.name}</h3>
                        <p className="mt-1 line-clamp-1 text-sm text-zinc-300">
                          {field.location || "Информацията се добавя от организатора"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 p-4">
                      <p className="line-clamp-2 text-sm text-zinc-400">
                        {field.description || "Отвори игрището, за да разгледаш информацията и галерията."}
                      </p>
                      <span className="shrink-0 text-sm font-black text-lime-300">Отвори →</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {images.length > 0 && (
          <section className="mt-8 rounded-[2rem] border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300">Снимки от терена</p><h2 className="mt-2 text-3xl font-black">Галерия</h2></div>
              <span className="text-sm font-bold text-zinc-500">{images.length} снимки</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <a key={image.id} href={image.image_url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                  <img src={image.image_url} alt={image.caption || `Снимка от ${fieldSettings.name}`} className="h-64 w-full object-cover transition duration-300 group-hover:scale-105" style={{ objectPosition: `${image.position_x ?? 50}% ${image.position_y ?? 50}%` }} />
                </a>
              ))}
            </div>
          </section>
        )}


        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
            <h2 className="text-3xl font-black">Информация</h2>
            <div className="mt-5 space-y-3 text-zinc-300">
              <Info label="Локация" value={`📍 ${fieldSettings.location}`} />
              {fieldSettings.ownPrice && (
                <Info
                  label="Стандартна цена"
                  value={`${fieldSettings.ownPrice} със собствено оборудване`}
                />
              )}
              {fieldSettings.rentalPrice && (
                <Info
                  label="Под наем"
                  value={`${fieldSettings.rentalPrice} с комплект под наем`}
                />
              )}
              <Info label="Статус" value="🟢 Активно игрище" />
              {fieldSettings.phone && (
                <Info label="Телефон" value={`☎ ${fieldSettings.phone}`} />
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Social href={fieldSettings.facebook} label="Facebook" icon="ⓕ" />
              <Social href={fieldSettings.instagram} label="Instagram" icon="◎" />
              <Social href={fieldSettings.tiktok} label="TikTok" icon="♪" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
            <h2 className="text-3xl font-black">Следващи игри</h2>
            <div className="mt-5 grid gap-4">
              {games.length > 0 ? (
                games.slice(0, 2).map((game) => (
                  <GameCard
                    key={game.id}
                    id={game.id}
                    title={game.title}
                    date={game.game_date}
                    time={game.game_time}
                    location={game.location}
                    maxRentalSets={game.max_rental_sets}
                    status={game.status}
                    description={game.description}
                    fieldName={fieldSettings.name}
                    fieldLogo={fieldSettings.logoUrl}
                    logoFit={fieldSettings.logoFit}
                    logoScale={fieldSettings.logoScale}
                    logoX={fieldSettings.logoX}
                    logoY={fieldSettings.logoY}
                    registeredCount={game.registered_count || 0}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-zinc-400">
                  В момента няма активни игри за това игрище.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 font-bold text-white">{value}</p>
    </div>
  );
}

function Social({ href, label, icon }: { href: string; label: string; icon: string }) {
  if (!href) return null;
  return (
    <a
      href={normalizeUrl(href)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-lime-400/25 bg-lime-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-lime-300 hover:bg-lime-400 hover:text-black"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-sm normal-case">
        {icon}
      </span>
      {label}
    </a>
  );
}

function normalizeUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}
