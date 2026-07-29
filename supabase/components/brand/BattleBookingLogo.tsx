import Link from "next/link";

type Props = {
  compact?: boolean;
  variant?: "navbar" | "hero" | "mark";
  className?: string;
  showText?: boolean;
};

export default function BattleBookingLogo({
  compact = false,
  variant = "navbar",
  className = "",
  showText = variant === "navbar",
}: Props) {
  const isHero = variant === "hero";
  const isMark = variant === "mark";

  const imageSize = isHero
    ? "h-28 w-auto max-w-[260px] sm:h-44 sm:max-w-[520px] md:h-60 md:max-w-[720px]"
    : compact || isMark
      ? "h-10 w-10 sm:h-14 sm:w-14"
      : "h-10 w-10 sm:h-12 sm:w-12";

  return (
    <Link
      href="/"
      className={`group inline-flex min-w-0 max-w-full items-center gap-2 overflow-visible ${className}`}
      aria-label="BattleBooking начало"
    >
      <img
        src="/battlebooking-mark-transparent.png"
        alt="BattleBooking"
        className={`${imageSize} shrink-0 object-contain drop-shadow-[0_0_24px_rgba(183,239,22,0.34)] transition duration-300 group-hover:scale-[1.05]`}
      />

      {showText && (
        <span className="min-w-0 truncate whitespace-nowrap text-sm font-black uppercase tracking-[0.08em] text-white transition group-hover:text-lime-200 sm:text-base lg:text-xl">
          Battle<span className="text-[#b7ef16]">Booking</span>
        </span>
      )}
    </Link>
  );
}
