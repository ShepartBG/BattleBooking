import BattleBookingLogo from "@/components/brand/BattleBookingLogo";

export default function FloatingHomeButton() {
  return (
    <div className="fixed bottom-4 left-4 z-50 hidden md:block">
      <div className="rounded-3xl border border-white/10 bg-black/55 p-2 backdrop-blur-2xl shadow-[0_0_35px_rgba(0,0,0,0.5)] transition hover:border-lime-400/30">
        <BattleBookingLogo variant="mark" showText={false} />
      </div>
    </div>
  );
}
