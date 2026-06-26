export default function HomeLoader() {
  return (
    <main className="bb-page-bg flex min-h-screen items-center justify-center text-white">
      <div className="rounded-[2rem] border border-white/10 bg-black/65 p-8 text-center backdrop-blur-xl">
        <img
          src="/battlebooking-mark.png"
          alt="BattleBooking"
          className="mx-auto mb-4 h-16 w-16 animate-pulse object-contain"
        />
        <p className="font-bold text-[#b7ef16]">Зареждане на игра...</p>
      </div>
    </main>
  );
}
