import FieldLogoFrame from "@/components/brand/FieldLogoFrame";

type GameCardProps = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  maxRentalSets: number;
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

export default function GameCard({
  id,
  title,
  date,
  time,
  location,
  maxRentalSets,
  fieldName = "Airsoft Field Warzone",
  fieldLogo = "/warzone-logo.png",
  logoFit = "contain",
  logoScale = 1,
  logoX = 0,
  logoY = 0,
}: GameCardProps) {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-black/60 p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#95c900]/45 hover:shadow-[0_0_55px_rgba(149,201,0,0.14)]">
      <div className="flex items-center gap-3">
        <FieldLogoFrame src={fieldLogo} alt={fieldName} size="sm" fit={logoFit} scale={logoScale} x={logoX} y={logoY} />
        <div className="min-w-0">
          <span className="inline-flex rounded-full border border-[#95c900]/35 bg-[#95c900]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#b7ef16]">
            ОТВОРЕНА
          </span>
          <p className="mt-2 truncate text-sm font-black text-white">{fieldName}</p>
        </div>
      </div>

      <h3 className="mt-5 text-2xl font-black text-white">{title}</h3>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-zinc-300">
        <Info label="Дата" value={`📅 ${formatDate(date)}`} />
        <Info label="Час" value={`🕒 ${time?.slice(0, 5)}`} />
        <Info label="Локация" value={`📍 ${location}`} />
        <Info label="Наеми" value={`🎒 ${maxRentalSets}`} />
      </div>

      <a
        href={`/game/${id}`}
        className="mt-5 block rounded-2xl bg-[#95c900] px-4 py-3 text-center font-black text-black transition hover:bg-[#b7ef16]"
      >
        Запиши се
      </a>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.20em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-xs text-white">{value}</p>
    </div>
  );
}
