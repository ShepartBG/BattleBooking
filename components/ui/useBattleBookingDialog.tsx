"use client";

import { useCallback, useState } from "react";
import BattleBookingLogo from "@/components/brand/BattleBookingLogo";

type DialogKind = "alert" | "confirm" | "prompt";

type DialogState = {
  kind: DialogKind;
  title: string;
  message: string;
  defaultValue?: string;
  resolve: (value: boolean | string | null) => void;
};

export function useBattleBookingDialog() {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState("");

  const close = useCallback((value: boolean | string | null) => {
    setDialog((current) => {
      if (current) current.resolve(value);
      return null;
    });
    setInputValue("");
  }, []);

  const bbAlert = useCallback((message: string, title = "BattleBooking") => {
    return new Promise<void>((resolve) => {
      setDialog({
        kind: "alert",
        title,
        message,
        resolve: () => resolve(),
      });
    });
  }, []);

  const bbConfirm = useCallback((message: string, title = "Потвърждение") => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        kind: "confirm",
        title,
        message,
        resolve: (value) => resolve(value === true),
      });
    });
  }, []);

  const bbPrompt = useCallback((message: string, defaultValue = "", title = "BattleBooking") => {
    setInputValue(defaultValue);
    return new Promise<string | null>((resolve) => {
      setDialog({
        kind: "prompt",
        title,
        message,
        defaultValue,
        resolve: (value) => resolve(typeof value === "string" ? value : null),
      });
    });
  }, []);

  function Dialog() {
    if (!dialog) return null;

    const isConfirm = dialog.kind === "confirm";
    const isPrompt = dialog.kind === "prompt";

    return (
      <div className="fixed inset-0 z-[120] grid place-items-center bg-black/72 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-[2rem] border border-lime-400/20 bg-[#050805] p-6 text-white shadow-[0_0_70px_rgba(149,201,0,.18)]">
          <div className="flex items-center gap-3">
            <BattleBookingLogo variant="mark" showText={false} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-lime-300">BattleBooking</p>
              <h3 className="mt-1 text-2xl font-black">{dialog.title}</h3>
            </div>
          </div>

          <p className="mt-5 whitespace-pre-line leading-7 text-zinc-300">{dialog.message}</p>

          {isPrompt && (
            <textarea
              className="bb-input mt-5 min-h-28"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              autoFocus
            />
          )}

          <div className={`mt-6 grid gap-3 ${isConfirm || isPrompt ? "sm:grid-cols-2" : ""}`}>
            {(isConfirm || isPrompt) && (
              <button
                type="button"
                onClick={() => close(isPrompt ? null : false)}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 font-black text-white hover:bg-white/[0.12]"
              >
                Отказ
              </button>
            )}
            <button
              type="button"
              onClick={() => close(isPrompt ? inputValue : true)}
              className="rounded-2xl bg-lime-500 px-4 py-3 font-black text-black hover:bg-lime-400"
            >
              {isConfirm || isPrompt ? "Потвърждавам" : "Добре"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return { Dialog, bbAlert, bbConfirm, bbPrompt };
}
