/**
 * Qlumio brand components – bruker faktiske logofiler fra /public
 *
 * QLogo          – Q-symbolet alene (icon-512x512.png)
 * QlumioBrand    – Q-symbol + "Qlumio" tekst (header-bruk)
 * QlumioWordmark – Det fullstendige wordmark-bildet (logo.png, logo + tekst)
 */

import Image from "next/image";

// ─── Q-symbol alene ───────────────────────────────────────────────────────────

export function QLogo({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/icon-512x512.png"
      alt="Qlumio"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}

// ─── Q-symbol + "Qlumio" tekst (kompakt header) ───────────────────────────────

export function QlumioBrand({
  iconSize = 36,
  className,
}: {
  iconSize?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <QLogo size={iconSize} />
      <span
        className="font-extrabold tracking-tight"
        style={{
          color: "var(--brand-dark)",
          fontSize: Math.round(iconSize * 0.58) + "px",
        }}
      >
        Qlumio
      </span>
    </div>
  );
}

// ─── Fullt wordmark-bilde (logo.png, brukes på login/register) ────────────────

export function QlumioWordmark({
  width = 180,
  className,
}: {
  width?: number;
  className?: string;
}) {
  // logo.png er 844 × 404 – bevar aspektforhold
  const height = Math.round(width * (404 / 844));
  return (
    <Image
      src="/logo.png"
      alt="Qlumio"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
