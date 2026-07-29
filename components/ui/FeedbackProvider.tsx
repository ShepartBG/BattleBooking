"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };
type ConfirmState = { message: string; resolve: (value: boolean) => void } | null;

type FeedbackContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  confirmAction: (message: string) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const push = useCallback((message: string, kind: ToastKind) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3600);
  }, []);

  const confirmAction = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => setConfirmState({ message, resolve }));
  }, []);

  const value = useMemo(
    () => ({
      success: (message: string) => push(message, "success"),
      error: (message: string) => push(message, "error"),
      info: (message: string) => push(message, "info"),
      confirmAction,
    }),
    [confirmAction, push],
  );

  function finishConfirm(value: boolean) {
    confirmState?.resolve(value);
    setConfirmState(null);
  }

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[10000] flex w-[min(92vw,420px)] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl transition-all ${
              toast.kind === "success"
                ? "border-lime-400/35 bg-lime-400/15 text-lime-100"
                : toast.kind === "error"
                  ? "border-red-400/35 bg-red-500/15 text-red-100"
                  : "border-sky-400/35 bg-sky-500/15 text-sky-100"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-lg">{toast.kind === "success" ? "✓" : toast.kind === "error" ? "!" : "i"}</span>
              <p className="font-bold leading-6">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {confirmState ? (
        <div className="fixed inset-0 z-[10001] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/15 bg-zinc-950 p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[.25em] text-lime-300">Потвърждение</p>
            <h3 className="mt-3 text-2xl font-black">Сигурен ли си?</h3>
            <p className="mt-3 leading-7 text-zinc-300">{confirmState.message}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => finishConfirm(false)} className="rounded-2xl border border-white/15 px-4 py-3 font-black text-zinc-200 hover:bg-white/5">ОТКАЗ</button>
              <button onClick={() => finishConfirm(true)} className="rounded-2xl bg-red-500 px-4 py-3 font-black text-white hover:bg-red-400">ПОТВЪРДИ</button>
            </div>
          </div>
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error("useFeedback must be used inside FeedbackProvider");
  return value;
}
