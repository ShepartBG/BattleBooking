"use client";

import { useEffect, useState } from "react";

type Props = {
  /** Game date (YYYY-MM-DD) */
  date: string;
  /** Game time (HH:MM[:SS]) */
  time?: string;
};

function parseStart(date: string, time?: string) {
  if (!date) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh = 0, mm = 0] = String(time || "00:00").split(":").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, hh, mm, 0).getTime();
}

function split(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

/** "T-minus" mission clock shown on public game pages. */
export default function MissionCountdown({ date, time }: Props) {
  const start = parseStart(date, time);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!start || now === null) return null;

  const left = start - now;
  const live = left <= 0;
  const t = split(left);
  const urgent = !live && left < 24 * 3600 * 1000;

  return (
    <div className={`bb-countdown ${urgent ? "is-urgent" : ""} ${live ? "is-live" : ""}`} role="timer" aria-live="off">
      <div className="bb-countdown-label">
        <span className="bb-countdown-blip" />
        {live ? "Мисията е в ход" : "До началото на мисията"}
      </div>
      {!live && (
        <div className="bb-countdown-clock">
          <Unit value={t.days} label="дни" />
          <Unit value={t.hours} label="часа" />
          <Unit value={t.minutes} label="мин" />
          <Unit value={t.seconds} label="сек" tick />
        </div>
      )}
    </div>
  );
}

function Unit({ value, label, tick }: { value: number; label: string; tick?: boolean }) {
  const text = String(value).padStart(2, "0");
  return (
    <div className="bb-countdown-unit">
      <span key={tick ? text : undefined} className={`bb-countdown-value ${tick ? "is-tick" : ""}`}>
        {text}
      </span>
      <span className="bb-countdown-unit-label">{label}</span>
    </div>
  );
}
