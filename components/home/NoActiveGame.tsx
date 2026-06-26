export default function NoActiveGame() {
  return (
    <main className="bb-page-bg flex min-h-screen items-center justify-center p-6 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-red-500/25 bg-black/75 p-8 text-center backdrop-blur-xl">
        <img
          src="/battlebooking-mark.png"
          alt="BattleBooking"
          className="mx-auto mb-4 h-16 w-16 object-contain opacity-80"
        />
        <h1 className="text-3xl font-black text-red-500">
          Регистрацията е затворена
        </h1>
        <p className="mt-4 text-zinc-300">В момента няма активна игра.</p>
      </div>
    </main>
  );
}
