const MAX_SEGMENTS = 20;

export function getSeatState(max: number, used: number) {
  const total = Math.max(0, Math.floor(Number(max) || 0));
  const free = Math.max(0, total - Math.max(0, Number(used) || 0));
  const empty = total > 0 && free === 0;
  const low = !empty && total > 0 && (free <= 2 || free / total <= 0.25);
  return { total, free, empty, low };
}

export function LastSeatsBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`bb-last-seats ${className}`}>
      <span className="bb-last-seats-dot" />
      Последни места
    </span>
  );
}

type Props = {
  max: number;
  used: number;
  label?: string;
  compact?: boolean;
  /** Show the "ПОСЛЕДНИ МЕСТА" tag under the meter (off when the parent shows it already) */
  showBadge?: boolean;
};

/** "Free spots" meter styled as a magazine of rounds. Turns red when few are left. */
export default function AmmoBar({ max, used, label = "Свободни комплекти", compact = false, showBadge = true }: Props) {
  const { total, free, empty, low } = getSeatState(max, used);
  if (total <= 0) return null;

  const segments = Math.min(total, MAX_SEGMENTS);
  const loaded = total <= MAX_SEGMENTS ? free : Math.round((free / total) * MAX_SEGMENTS);
  const tone = empty ? "is-empty" : low ? "is-low" : "";

  return (
    <div
      className={`bb-ammo ${tone} ${compact ? "is-compact" : ""}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={free}
    >
      <div className="bb-ammo-head">
        <span className="bb-ammo-label">🎒 {label}</span>
        <span className="bb-ammo-count">
          {empty ? "НЯМА" : free}
          <small>/{total}</small>
        </span>
      </div>

      <div className="bb-ammo-mag">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={`bb-ammo-round ${i < loaded ? "is-loaded" : ""}`}
            style={{ "--i": i } as React.CSSProperties}
          />
        ))}
      </div>

      {((low && showBadge) || empty) && (
        <div className="bb-ammo-foot">
          {low ? <LastSeatsBadge /> : <span className="bb-ammo-out">Всички комплекти са заети</span>}
        </div>
      )}
    </div>
  );
}
