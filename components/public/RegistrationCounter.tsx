"use client";

import { useEffect, useState } from "react";

const REFRESH_MS = 45_000;
const MIN_DIGITS = 5;

/** Live platform-wide counter of every registration on every field. */
export default function RegistrationCounter({ className = "" }: { className?: string }) {
  const [total, setTotal] = useState<number | null>(null);
  const [bumped, setBumped] = useState(false);

  useEffect(() => {
    let mounted = true;
    let previous: number | null = null;

    async function load() {
      const response = await fetch("/api/platform-stats", { cache: "no-store" }).catch(() => null);
      const result = await response?.json().catch(() => null);
      if (!mounted || !result?.ok) return;
      const next = Number(result.totalRegistrations || 0);
      if (previous !== null && next > previous) {
        setBumped(true);
        window.setTimeout(() => mounted && setBumped(false), 1600);
      }
      previous = next;
      setTotal(next);
    }

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const digits = String(total ?? 0).padStart(MIN_DIGITS, "0").split("");

  return (
    <div className={`bb-counter ${bumped ? "is-bumped" : ""} ${className}`} data-testid="registration-counter">
      <div className="bb-counter-head">
        <span className="bb-counter-live" />
        <span>Записвания в платформата</span>
      </div>
      <div className="bb-counter-digits" aria-live="polite" aria-label={`${total ?? 0} записвания`}>
        {digits.map((digit, index) => (
          <span key={index} className="bb-counter-cell">
            <span className="bb-counter-reel" style={{ "--d": total === null ? 0 : Number(digit) } as React.CSSProperties}>
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        ))}
      </div>
      <p className="bb-counter-foot">Всяко записване на всички игрища · обновява се на живо</p>
    </div>
  );
}
