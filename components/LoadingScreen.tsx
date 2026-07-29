import BattleBookingLoader from "@/components/BattleBookingLoader";

export default function LoadingScreen({
  title = "ЗАРЕЖДАНЕ...",
  subtitle = "Подготвяме BattleBooking",
}: {
  title?: string;
  subtitle?: string;
}) {
  return <BattleBookingLoader title={title} subtitle={subtitle} variant="fullscreen" />;
}
