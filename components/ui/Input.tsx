import { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export default function Input({ error, className = "", ...props }: Props) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border bg-black/55 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/15 ${
        error ? "border-red-500/70" : "border-white/10"
      } ${className}`}
    />
  );
}
