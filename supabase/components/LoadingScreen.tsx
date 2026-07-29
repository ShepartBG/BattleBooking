export default function LoadingScreen({
  title = "Зареждане...",
  subtitle = "Подготвяме BattleBooking",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-16 text-white"
      style={{
        minHeight: "100dvh",
        background:
          "radial-gradient(circle at top, rgba(149,201,0,0.12), transparent 32%), linear-gradient(180deg, #020403 0%, #050807 48%, #000000 100%)",
      }}
    >
      <div className="flex flex-col items-center text-center">
        <img
          src="/loading-logo-small.png"
          alt="BattleBooking"
          width={112}
          height={112}
          loading="eager"
          decoding="sync"
          fetchPriority="high"
          className="h-28 w-28 animate-pulse object-contain"
        />

        <div className="mt-7 h-1.5 w-36 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[loading-bar_1.25s_ease-in-out_infinite] rounded-full bg-[#95c900]" />
        </div>

        <h1 className="mt-7 text-xl font-black uppercase tracking-[0.22em] text-white">
          {title}
        </h1>
        <p className="mt-3 text-sm text-zinc-400">{subtitle}</p>
      </div>
    </main>
  );
}
