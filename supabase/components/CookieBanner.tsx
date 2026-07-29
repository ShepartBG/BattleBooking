"use client";

import { useEffect, useState } from "react";

const COOKIE_KEY = "battlebooking-cookie-consent-v1";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!localStorage.getItem(COOKIE_KEY));
  }, []);

  function saveConsent(value: "necessary" | "all") {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ value, acceptedAt: new Date().toISOString() }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-4xl rounded-[1.5rem] border border-lime-400/25 bg-black/90 p-4 shadow-[0_0_60px_rgba(0,0,0,.7)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-lime-300">Бисквитки</p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Използваме нужни бисквитки/локално съхранение за работата на сайта. Аналитични или маркетинг бисквитки се използват само след съгласие.
          </p>
          <a href="/cookies" className="mt-2 inline-block text-sm font-bold text-lime-300 hover:text-white">
            Политика за бисквитките
          </a>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => saveConsent("necessary")}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white hover:bg-white/10"
          >
            Само нужните
          </button>
          <button
            type="button"
            onClick={() => saveConsent("all")}
            className="rounded-2xl bg-lime-500 px-4 py-3 text-sm font-black text-black hover:bg-lime-400"
          >
            Приемам
          </button>
        </div>
      </div>
    </div>
  );
}
