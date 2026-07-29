"use client";

function GrenadeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <path d="M25 10h14v8H25z" fill="currentColor" opacity=".9" />
      <path d="M39 12h8l5 6-5 5-5-5h-3z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 18h20l5 10v19c0 7-6 13-13 13h-4c-7 0-13-6-13-13V28z" fill="currentColor" />
      <path d="M24 29h16M24 39h16M28 22v34M37 22v34" fill="none" stroke="#071005" strokeWidth="3" opacity=".55" />
    </svg>
  );
}

export default function BattleBookingLoader({
  title = "ЗАРЕЖДАНЕ...",
  subtitle = "Подготвяме BattleBooking",
  variant = "fullscreen",
}: {
  title?: string;
  subtitle?: string;
  variant?: "fullscreen" | "section" | "inline";
}) {
  const content = (
    <div className="bb-loader-content" role="status" aria-live="polite">
      <div className="bb-loader-orbit" aria-hidden="true">
        <div className="bb-loader-logo-wrap">
          <img
            src="/loading-logo-small.png"
            alt=""
            width={112}
            height={112}
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="bb-loader-logo"
          />
        </div>
        <div className="bb-loader-grenade-track">
          <GrenadeIcon className="bb-loader-grenade" />
        </div>
      </div>

      <div className="bb-loader-progress" aria-hidden="true">
        <div className="bb-loader-progress-bar" />
      </div>

      <p className="bb-loader-title">{title}</p>
      <p className="bb-loader-subtitle">{subtitle}</p>
    </div>
  );

  if (variant === "inline") {
    return <div className="bb-loader bb-loader-inline">{content}</div>;
  }

  if (variant === "section") {
    return <div className="bb-loader bb-loader-section">{content}</div>;
  }

  return <main className="bb-loader bb-loader-fullscreen">{content}</main>;
}
