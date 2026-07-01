import FieldLogoFrame from "@/components/brand/FieldLogoFrame";
import { isUrlLocation, normalizeLocationUrl, shortLocationLabel } from "@/utils/location";

type GameStatus = "active" | "closed" | "postponed" | string;

type GameCardProps = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  maxRentalSets: number;
  status?: GameStatus;
  fieldName?: string;
  fieldLogo?: string;
  logoFit?: "contain" | "cover";
  logoScale?: number;
  logoX?: number;
  logoY?: number;
};

function formatDate(date: string) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

function getStatusView(status: GameStatus) {
  if (status === "postponed") {
    return {
      label: "ОТЛОЖЕНА",
      className: "border-red-500/50 bg-red-500/15 text-red-300",
      button: "Виж информация",
      buttonClass: "bg-red-600 text-white hover:bg-red-500",
    };
  }

  if (status === "closed") {
    return {
      label: "ЗАТВОРЕНА",
      className: "border-zinc-500/35 bg-zinc-500/10 text-zinc-300",
      button: "Виж играта",
      buttonClass: "bg-zinc-700 text-white hover:bg-zinc-600",
    };
  }

  return {
    label: "ОТВОРЕНА",
    className: "border-[#95c900]/35 bg-[#95c900]/10 text-[#b7ef16]",
    button: "Запиши се",
    buttonClass: "bg-[#95c900] text-black hover:bg-[#b7ef16]",
  };
}

export default function GameCard({
  id,
  title,
  date,
  time,
  location,
  maxRentalSets,
  status = "active",
  fieldName = "Airsoft Field Warzone",
  fieldLogo = "/warzone-logo.png",
  logoFit = "contain",
  logoScale = 1,
  logoX = 0,
  logoY = 0,
}: GameCardProps) {
  const statusView = getStatusView(status);

  return (
    <article className={`rounded-[1.75rem] border bg-black/60 p-4 sm:rounded-[2rem] sm:p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 ${
      status === "postponed"
        ? "border-red-500/25 hover:border-red-400/55 hover:shadow-[0_0_55px_rgba(239,68,68,0.14)]"
        : "border-white/10 hover:border-[#95c900]/45 hover:shadow-[0_0_55px_rgba(149,201,0,0.14)]"
    }`}>
      <div className="flex items-center gap-3">
        <FieldLogoFrame src={fieldLogo} alt={fieldName} size="sm" fit={logoFit} scale={logoScale} x={logoX} y={logoY} />
        <div className="min-w-0">
          <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${statusView.className}`}>
            {statusView.label}
          </span>
          <p className="mt-2 truncate text-sm font-black text-white">{fieldName}</p>
        </div>
      </div>

      <h3 className="mt-5 text-2xl font-black leading-tight text-white">{title}</h3>

      {status === "postponed" && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-xl font-black uppercase tracking-tight text-red-300">
            🚨 ИГРАТА СЕ ОТЛАГА
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 text-sm font-bold text-zinc-300 min-[420px]:grid-cols-2">
        <Info label="Дата" value={`📅 ${formatDate(date)}`} />
        <Info label="Час" value={`🕒 ${time?.slice(0, 5)}`} />
        <Info label="Локация" value={location} isLocation />
        <Info label="Наеми" value={`🎒 ${maxRentalSets}`} />
      </div>

      <a
        href={`/game/${id}`}
        className={`mt-5 block min-h-12 rounded-2xl px-4 py-3.5 text-center font-black transition ${statusView.buttonClass}`}
      >
        {statusView.button}
      </a>
    </article>
  );
}

function Info({
  label,
  value,
  isLocation = false,
}: {
  label: string;
  value: string;
  isLocation?: boolean;
}) {
  const locationIsUrl = isLocation && isUrlLocation(value);

  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
      <p className="text-[10px] font-black uppercase tracking-[0.20em] text-zinc-500">
        {label}
      </p>
      {locationIsUrl ? (
        <a
          href={normalizeLocationUrl(value)}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex max-w-full items-center gap-1 text-sm font-black text-[#b7ef16] underline-offset-4 hover:underline"
        >
          📍 {shortLocationLabel(value)}
        </a>
      ) : (
        <p className="mt-1 break-words text-sm text-white">
          {isLocation ? `📍 ${shortLocationLabel(value)}` : value}
        </p>
      )}
    </div>
  );
}
