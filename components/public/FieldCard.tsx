import FieldLogoFrame from "@/components/brand/FieldLogoFrame";

const DEFAULT_LOGO = "/battlebooking-real-logo-transparent.png";
const DEFAULT_BG = "/battlebooking-bg.jpg";

type Props = {
  name: string;
  location: string;
  description: string;
  href: string;
  status?: string;
  image?: string;
  logo?: string;
  logoFit?: "contain" | "cover";
  logoScale?: number;
  logoX?: number;
  logoY?: number;
};

export default function FieldCard({
  name,
  location,
  description,
  href,
  status = "Активно",
  image = DEFAULT_BG,
  logo = DEFAULT_LOGO,
  logoFit = "contain",
  logoScale = 1,
  logoX = 0,
  logoY = 0,
}: Props) {
  return (
    <article className="group overflow-hidden rounded-[2rem] border border-white/10 bg-black/60 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#95c900]/45 hover:shadow-[0_0_55px_rgba(149,201,0,0.14)]">
      <div
        className="relative h-48 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,.18), rgba(0,0,0,.88)), url('${image}')`,
        }}
      >
        <div className="absolute left-4 top-4 rounded-full border border-[#95c900]/35 bg-[#95c900]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#b7ef16]">
          {status}
        </div>
      </div>

      <div className="relative p-5 pt-0">
        <div className="-mt-10 flex items-end gap-4">
          <FieldLogoFrame
            src={logo}
            alt={name}
            size="md"
            fit={logoFit}
            scale={logoScale}
            x={logoX}
            y={logoY}
          />
          <div className="min-w-0 pb-2">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b7ef16]/80">
              Игрище
            </p>
            <h3 className="mt-1 line-clamp-2 text-2xl font-black leading-tight text-white">
              {name}
            </h3>
          </div>
        </div>

        <p className="mt-5 text-sm font-bold text-[#c5df68]">📍 {location}</p>
        <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-400">
          {description}
        </p>

        <a
          href={href}
          className="mt-5 block rounded-2xl border border-[#95c900]/30 bg-[#95c900]/10 px-4 py-3 text-center font-black text-[#b7ef16] transition hover:bg-[#95c900] hover:text-black"
        >
          Виж игрището
        </a>
      </div>
    </article>
  );
}
