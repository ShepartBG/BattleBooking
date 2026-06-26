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
    ? "h-52 w-auto max-w-[620px] md:h-64 md:max-w-[760px]"
    : compact || isMark
      ? "h-28 w-28 sm:h-32 sm:w-32"
      : "h-24 w-24 sm:h-28 sm:w-28";

  return (
    <Link
      href="/"
      className={`group inline-flex min-w-0 max-w-full items-center gap-3 overflow-visible ${className}`}
      aria-label="BattleBooking начало"
    >
      <img
        src="/battlebooking-mark-transparent.png"
        alt="BattleBooking"
        className={`${imageSize} shrink-0 object-contain drop-shadow-[0_0_28px_rgba(183,239,22,0.34)] transition duration-300 group-hover:scale-[1.05]`}
      />

      {showText && (
        <span className="hidden whitespace-nowrap text-2xl font-black uppercase tracking-[0.08em] text-white transition group-hover:text-lime-200 sm:inline-block lg:text-3xl">
          Battle<span className="text-[#b7ef16]">Booking</span>
        </span>
      )}
    </Link>
  );
}
