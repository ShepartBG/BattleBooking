type Props = {
  maxRentalSets: number;
  rentalPlayers: number;
  rentalPrice?: string;
};

const ITEMS = [
  { key: "helmet", label: "Каска", note: "Тактическа FAST", icon: HelmetIcon },
  { key: "mask", label: "Маска", note: "Защита за лице и очи", icon: MaskIcon },
  { key: "replica", label: "Реплика", note: "Заредена и тествана", icon: ReplicaIcon },
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

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
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

function HelmetIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M8 38c0-15 10.5-26 24-26s24 11 24 26v4H8z" fill="currentColor" fillOpacity=".14" />
      <path d="M8 42h48M14 42v6h10l4-6M50 42v6H40" />
      <path d="M20 22h24M17 30h30" opacity=".7" />
      <rect x="44" y="30" width="9" height="7" rx="1.5" />
      <path d="M30 12v-2h4v2" />
    </svg>
  );
}

function MaskIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
      <path d="M8 22c8-6 40-6 48 0v8c0 4-3 6-7 6H15c-4 0-7-2-7-6z" fill="currentColor" fillOpacity=".14" />
      <path d="M16 23h12v8H16zM36 23h12v8H36z" fill="currentColor" fillOpacity=".3" />
      <path d="M14 36c2 10 9 16 18 16s16-6 18-16" />
      <path d="M24 42h16M24 47h16M28 38v12M36 38v12" opacity=".7" />
      <path d="M8 26H3M56 26h5" />
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
