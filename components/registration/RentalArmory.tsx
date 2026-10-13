type Props = {
  maxRentalSets: number;
  rentalPlayers: number;
  rentalPrice?: string;
};

const ITEMS = [
  { key: "mask", label: "Маска", note: "Защита за лицето", icon: MaskIcon },
  { key: "goggles", label: "Очила", note: "Балистична защита", icon: GogglesIcon },
  { key: "replica", label: "Реплика", note: "Заредена и тествана", icon: ReplicaIcon },
  { key: "vest", label: "Жилетка", note: "Тактическа с джобове", icon: VestIcon },
] as const;

/** Rental kit presented as an armory rack; each item spins in 3D on hover. */
export default function RentalArmory({ maxRentalSets, rentalPlayers, rentalPrice }: Props) {
  if (!maxRentalSets || maxRentalSets <= 0) return null;

  return (
    <section className="bb-armory rounded-[2rem] border border-lime-400/20 bg-black/65 p-4 backdrop-blur-xl md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-lime-300">Оръжейна</p>
          <h3 className="mt-1 text-2xl font-black text-white">Комплект под наем</h3>
          <p className="mt-1 text-sm text-zinc-400">Всичко нужно за мисията — получаваш го на терена.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-300">
            {Math.max(0, maxRentalSets - rentalPlayers)} свободни
          </span>
          {rentalPrice && (
            <span className="rounded-2xl border border-lime-400/25 bg-lime-400/10 px-4 py-2 text-lg font-black text-lime-300">
              {rentalPrice}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {ITEMS.map(({ key, label, note, icon: Icon }) => (
          <div key={key} className="bb-armory-slot" tabIndex={0}>
            <div className="bb-armory-stage">
              <div className="bb-armory-item">
                <span className="bb-armory-layer is-back"><Icon /></span>
                <span className="bb-armory-layer is-mid"><Icon /></span>
                <span className="bb-armory-layer is-front"><Icon /></span>
              </div>
            </div>
            <p className="mt-2 text-center text-sm font-black text-white">{label}</p>
            <p className="hidden text-center text-[11px] font-bold text-zinc-500 sm:block">{note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MaskIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M10 24c6-4 38-4 44 0l-2 14c-2 12-10 18-20 18S14 50 12 38z" fill="currentColor" fillOpacity=".14" />
      <path d="M18 30h28M17 37h30M20 44h24M24 26v26M32 25v29M40 26v26" opacity=".7" />
      <path d="M10 26L3 22M54 26l7-4M12 36l-8 2M52 36l8 2" />
    </svg>
  );
}

function ReplicaIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M4 26h38l4-3h10v8H44l-4 3H24l-3 4h-6l1-6H4z" fill="currentColor" fillOpacity=".14" />
      <path d="M26 34l-2 14h7l3-14" fill="currentColor" fillOpacity=".2" />
      <path d="M33 34l3 9h5l-2-9" />
      <path d="M56 27h6M12 22h18v4M18 22v-3h8v3" />
    </svg>
  );
}

function GogglesIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M6 26c0-4 3-6 7-6h38c4 0 7 2 7 6v8c0 5-3 8-8 8h-8c-3 0-5-2-6-5l-1-3c-1-2-3-2-4 0l-1 3c-1 3-3 5-6 5h-8c-5 0-8-3-8-8z" fill="currentColor" fillOpacity=".14" />
      <path d="M12 26h14v10H12zM38 26h14v10H38z" fill="currentColor" fillOpacity=".32" />
      <path d="M6 29H2M58 29h4" />
      <path d="M15 28l5 5M41 28l5 5" opacity=".6" />
    </svg>
  );
}

function VestIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M22 8l-10 6v42h40V14L42 8c-2 6-6 9-10 9s-8-3-10-9z" fill="currentColor" fillOpacity=".14" />
      <path d="M32 17v39" opacity=".6" />
      <rect x="15" y="30" width="13" height="10" rx="1.5" fill="currentColor" fillOpacity=".3" />
      <rect x="36" y="30" width="13" height="10" rx="1.5" fill="currentColor" fillOpacity=".3" />
      <path d="M15 45h13M36 45h13M15 50h13M36 50h13" opacity=".7" />
    </svg>
  );
}
