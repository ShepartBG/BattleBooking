"use client";

import { useEffect, useState } from "react";
import FieldLogoFrame from "@/components/brand/FieldLogoFrame";
import { isUrlLocation, normalizeLocationUrl } from "@/utils/location";

type Props = {
  code: string;
  fieldName?: string;
  fieldLogo?: string;
  logoFit?: "contain" | "cover";
  logoScale?: number;
  logoX?: number;
  logoY?: number;
  gameTitle?: string;
  date?: string;
  time?: string;
  location?: string;
  participation?: string;
};

const SCRAMBLE = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#@%&";

/** Reveals the code like a decrypted transmission: random glyphs settle left to right. */
function useDecrypt(target: string) {
  const [text, setText] = useState(target);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(target);
      return;
    }
    let frame = 0;
    const total = 26;
    const timer = window.setInterval(() => {
      frame++;
      const settled = Math.floor((frame / total) * target.length);
      setText(
        target
          .split("")
          .map((char, i) => (i < settled ? char : SCRAMBLE[Math.floor(Math.random() * SCRAMBLE.length)]))
          .join(""),
      );
      if (frame >= total) {
        window.clearInterval(timer);
        setText(target);
      }
    }, 45);
    return () => window.clearInterval(timer);
  }, [target]);

  return text;
}

function barcodeBars(code: string) {
  const bars: number[] = [];
  for (const char of code.repeat(4)) {
    const n = char.charCodeAt(0);
    bars.push((n % 3) + 1, ((n >> 2) % 2) + 1);
  }
  return bars;
}

export default function SuccessScreen({
  code,
  fieldName = "Airsoft Field Warzone",
  fieldLogo = "/warzone-logo.png",
  logoFit = "contain",
  logoScale = 1,
  logoX = 0,
  logoY = 0,
  gameTitle,
  date,
  time,
  location,
  participation,
}: Props) {
  const shownCode = useDecrypt(code);

  return (
    <main className="flex min-h-[72vh] items-center justify-center p-4 text-white sm:p-6">
      <div className="bb-mission w-full max-w-md">
        <p className="bb-mission-banner">
          <span>■</span> Мисията е потвърдена <span>■</span>
        </p>

        <div className="bb-ticket relative overflow-hidden rounded-[2rem] border border-[#95c900]/40 bg-black/85 p-6 text-center shadow-[0_0_45px_rgba(149,201,0,0.16)] backdrop-blur-xl sm:p-8">
          <span className="bb-ticket-scan" aria-hidden="true" />
          <span className="bb-ticket-corner is-tl" aria-hidden="true" />
          <span className="bb-ticket-corner is-tr" aria-hidden="true" />
          <span className="bb-ticket-corner is-bl" aria-hidden="true" />
          <span className="bb-ticket-corner is-br" aria-hidden="true" />

          <div className="flex justify-center">
            <FieldLogoFrame src={fieldLogo} alt={fieldName} size="lg" fit={logoFit} scale={logoScale} x={logoX} y={logoY} />
          </div>
          <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-zinc-500">{fieldName}</p>
          <h1 className="mt-2 text-3xl font-black text-[#b7ef16]">Успешна регистрация!</h1>

          {(gameTitle || date) && (
            <div className="mt-5 grid gap-2 text-left text-sm">
              {gameTitle && <TicketRow label="Мисия" value={gameTitle} />}
              {(date || time) && <TicketRow label="Начало" value={[date, time].filter(Boolean).join(" · ")} />}
              {participation && <TicketRow label="Екипировка" value={participation} />}
            </div>
          )}

          {location && <LocationButton location={location} />}

          <div className="bb-ticket-perforation" aria-hidden="true" />

          <p className="text-zinc-300">Запази този код:</p>
          <div className="bb-ticket-code mt-4 rounded-2xl border border-zinc-700 bg-zinc-950 p-5 text-5xl font-black" aria-hidden="true">
            {shownCode}
          </div>
          <span className="sr-only">{code}</span>

          <div className="bb-barcode mt-5" aria-hidden="true">
            {barcodeBars(code).map((w, i) => (
              <span key={i} style={{ width: `${w * 2}px`, opacity: i % 2 ? 0 : 1 }} />
            ))}
          </div>
          <p className="mt-2 text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">
            Покажи кода на терена
          </p>
        </div>
      </div>
    </main>
  );
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-white/10 pb-2">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">{label}</span>
      <span className="min-w-0 text-right font-black leading-snug text-white [overflow-wrap:anywhere]">{value}</span>
    </div>
  );
}

function mapsUrl(location: string) {
  return isUrlLocation(location)
    ? normalizeLocationUrl(location)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function LocationButton({ location }: { location: string }) {
  const isUrl = isUrlLocation(location);
  return (
    <div className="mt-4 text-left">
      {!isUrl && (
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
          Позиция
          <span className="mt-1 block text-sm normal-case tracking-normal text-white [overflow-wrap:anywhere]">{location}</span>
        </p>
      )}
      <a
        href={mapsUrl(location)}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-lime-400/40 bg-lime-400/10 px-4 py-3 text-center text-sm font-black uppercase tracking-[0.08em] text-lime-200 transition hover:bg-lime-400 hover:text-black"
      >
        📍 Отвори локацията в Google Maps
      </a>
    </div>
  );
}
