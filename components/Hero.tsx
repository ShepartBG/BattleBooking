import FieldLogoFrame from "@/components/brand/FieldLogoFrame";

type HeroProps = {
  title: string;
  date: string;
  time: string;
  location: string;
  description?: string | null;
  fieldName?: string;
  fieldLogo?: string;
  backgroundUrl?: string;
  phone?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  logoFit?: "contain" | "cover";
  logoScale?: number;
  logoX?: number;
  logoY?: number;
};

export default function Hero({
  title,
  date,
  time,
  location,
  description,
  fieldName = "Airsoft Field Warzone",
  fieldLogo = "/warzone-logo.png",
  backgroundUrl = "/warzone-bg.jpg",
  phone = "",
  facebook = "",
  instagram = "",
  tiktok = "",
  logoFit = "contain",
  logoScale = 1,
  logoX = 0,
  logoY = 0,
}: HeroProps) {
  const hasSocials = Boolean(facebook || instagram || tiktok || phone);

  return (
    <section className="group relative overflow-hidden rounded-[2.4rem] border border-lime-400/20 bg-black/70 p-4 shadow-[0_0_60px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-6">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-55 transition duration-700 group-hover:scale-[1.02]"
        style={{ backgroundImage: `url('${backgroundUrl}')` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_26%,rgba(132,204,22,0.22),transparent_32%),linear-gradient(115deg,rgba(0,0,0,0.92),rgba(0,0,0,0.64),rgba(0,0,0,0.88))]" />
      <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-lime-400/10 blur-3xl transition duration-700 group-hover:bg-lime-400/16" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-lime-400/50 to-transparent" />

      <div className="relative z-10 grid gap-5 md:grid-cols-[0.38fr_1.62fr] md:items-center">
        <div className="flex items-center justify-center md:justify-start">
          <FieldLogoFrame src={fieldLogo} alt={fieldName} size="lg" fit={logoFit} scale={logoScale} x={logoX} y={logoY} />
        </div>

        <div className="text-center md:text-left">
          <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-lime-400/25 bg-lime-400/10 px-4 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-lime-300 md:mx-0">
            <span className="h-2 w-2 rounded-full bg-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.8)]" />
            BattleBooking Premium
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.42em] text-zinc-400">
            {fieldName}
          </p>

          <h1 className="mt-2 text-3xl font-black uppercase leading-[0.92] tracking-tight text-white md:text-5xl">
            {title}
          </h1>

          {description && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              {description}
            </p>
          )}

          {hasSocials && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
              {phone && <SocialPill href={`tel:${phone}`} label="Телефон" icon="☎" />}
              <SocialPill href={facebook} label="Facebook" icon="ⓕ" />
              <SocialPill href={instagram} label="Instagram" icon="◎" />
              <SocialPill href={tiktok} label="TikTok" icon="♪" />
            </div>
          )}

          <div className="mt-5 grid gap-2 text-left sm:grid-cols-3">
            <InfoPill label="Дата" value={`📅 ${date}`} />
            <InfoPill label="Час" value={`🕒 ${time}`} />
            <InfoPill label="Локация" value={`📍 ${location}`} />
          </div>
        </div>
      </div>
    </section>
  );
}

function normalizeUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("tel:")) return url;
  return `https://${url}`;
}

function SocialPill({ href, label, icon }: { href: string; label: string; icon: string }) {
  const normalized = normalizeUrl(href);
  if (!normalized) return null;
  return (
    <a
      href={normalized}
      target={normalized.startsWith("tel:") ? undefined : "_blank"}
      className="inline-flex items-center gap-2 rounded-full border border-lime-400/25 bg-black/40 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-lime-300 transition hover:bg-lime-400 hover:text-black"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[11px] normal-case">
        {icon}
      </span>
      {label}
    </a>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-md">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
