/**
 * Qlumio brand components
 *
 * QLogo      – the Q symbol (gradient ring + house)
 * QlumioBrand – Q symbol + wordmark side by side
 */

// ─── Q ring math ──────────────────────────────────────────────────────────────
// viewBox 0 0 120 120, center (60, 60)
// Outer radius 42, ring stroke-width 14
// 315° arc (dasharray="231 33"), rotated 75° to place gap at 4-5 o'clock

export function QLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className ?? "w-9 h-9"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="qlgrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#8B5CF6" />
          <stop offset="55%"  stopColor="#6366F1" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="qlgrad2" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
      </defs>

      {/* ── Ring: 315° arc, gap at 4-5 o'clock ── */}
      <circle
        cx="60"
        cy="60"
        r="42"
        stroke="url(#qlgrad)"
        strokeWidth="15"
        strokeLinecap="round"
        strokeDasharray="231 33"
        transform="rotate(75, 60, 60)"
      />

      {/* ── Tail of Q: from gap area toward lower-right ── */}
      <line
        x1="86"
        y1="89"
        x2="105"
        y2="108"
        stroke="url(#qlgrad2)"
        strokeWidth="15"
        strokeLinecap="round"
      />

      {/* ── White chevron (house roof) ── */}
      <path
        d="M 36 67 L 60 47 L 84 67"
        stroke="white"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ── 4 colored squares (module icons) ── */}
      <rect x="38" y="71" width="19" height="19" rx="4"  fill="#A855F7" />
      <rect x="62" y="71" width="19" height="19" rx="4"  fill="#2DD4BF" />
      <rect x="38" y="93" width="19" height="19" rx="4"  fill="#F472B6" />
      <rect x="62" y="93" width="19" height="19" rx="4"  fill="#FBBF24" />
    </svg>
  );
}

export function QlumioBrand({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <QLogo className="w-9 h-9 flex-shrink-0" />
      <span
        className="text-xl font-extrabold tracking-tight"
        style={{ color: "var(--brand-dark)" }}
      >
        Qlumio
      </span>
    </div>
  );
}
