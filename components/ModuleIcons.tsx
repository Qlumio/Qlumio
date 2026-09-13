/**
 * Qlumio modul-ikoner – illustrert stil med lavendelbakgrunn og brand-gradienter
 * Én komponent per modul: Aktiviteter, Gjøremål, Innkjøp, Eiendeler, Økonomi
 */

type IconProps = { size?: number; className?: string };

// ─── Delte gradienter (inline per SVG for å unngå ID-konflikter) ───────────────

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}_purp`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#6366F1" />
      </linearGradient>
      <linearGradient id={`${id}_blue`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id={`${id}_teal`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2DD4BF" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
      <linearGradient id={`${id}_grad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="50%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id={`${id}_gold`} x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#FCD34D" />
      </linearGradient>
      <linearGradient id={`${id}_pink`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
      <linearGradient id={`${id}_oran`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FBBF24" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
  );
}

// ─── 1. Aktiviteter – to figurer med hjerte og ball ───────────────────────────

export function AktiviteterIkon({ size = 56, className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <Defs id="akt" />
      {/* Bakgrunnssirkel */}
      <circle cx="50" cy="50" r="50" fill="#EEF2FF" />

      {/* Hjerte øverst */}
      <path
        d="M50 32 C50 32 44 26 38 29 C32 32 32 39 38 44 L50 55 L62 44 C68 39 68 32 62 29 C56 26 50 32 50 32Z"
        fill={`url(#akt_purp)`}
        transform="scale(0.55) translate(41, 18)"
      />

      {/* Venstre figur (lilla) */}
      <circle cx="34" cy="38" r="7" fill={`url(#akt_purp)`} />
      <path d="M22 72 Q34 55 46 72" fill={`url(#akt_purp)`} />
      {/* Venstre armer */}
      <line x1="34" y1="48" x2="18" y2="58" stroke={`#8B5CF6`} strokeWidth="5" strokeLinecap="round" />
      <line x1="34" y1="48" x2="46" y2="56" stroke={`#8B5CF6`} strokeWidth="5" strokeLinecap="round" />

      {/* Høyre figur (teal) */}
      <circle cx="66" cy="38" r="7" fill={`url(#akt_teal)`} />
      <path d="M54 72 Q66 55 78 72" fill={`url(#akt_teal)`} />
      {/* Høyre armer */}
      <line x1="66" y1="48" x2="54" y2="56" stroke={`#2DD4BF`} strokeWidth="5" strokeLinecap="round" />
      <line x1="66" y1="48" x2="82" y2="58" stroke={`#2DD4BF`} strokeWidth="5" strokeLinecap="round" />

      {/* Fotball */}
      <circle cx="50" cy="76" r="9" fill={`url(#akt_blue)`} />
      <path d="M44 72 L50 68 L56 72 L56 80 L50 84 L44 80Z" fill="none" stroke="white" strokeWidth="1.2" opacity="0.5" />
      <circle cx="50" cy="76" r="9" fill="none" stroke="white" strokeWidth="1.2" opacity="0.3" />

      {/* Hjerte (riktig plassering) */}
      <path
        d="M50 28 C50 28 46.5 24 43 25.5 C39.5 27 39.5 31 43 34 L50 40 L57 34 C60.5 31 60.5 27 57 25.5 C53.5 24 50 28 50 28Z"
        fill={`url(#akt_purp)`}
      />
    </svg>
  );
}

// ─── 2. Gjøremål – utklippstavle med avkryssede punkter ───────────────────────

export function GjoremalIkon({ size = 56, className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <Defs id="gjr" />
      <circle cx="50" cy="50" r="50" fill="#EEF2FF" />

      {/* Clipboard body */}
      <rect x="24" y="32" width="52" height="50" rx="8" fill={`url(#gjr_grad)`} />

      {/* Clipboard topp-klemme */}
      <rect x="38" y="26" width="24" height="12" rx="6" fill={`url(#gjr_blue)`} />
      <rect x="43" y="29" width="14" height="6" rx="3" fill="white" opacity="0.4" />

      {/* Linje 1 – avkrysset */}
      <rect x="32" y="50" width="36" height="4" rx="2" fill="white" opacity="0.2" />
      <path d="M33 52 L37 56 L45 47" stroke={`#2DD4BF`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Linje 2 – avkrysset */}
      <rect x="32" y="62" width="30" height="4" rx="2" fill="white" opacity="0.2" />
      <path d="M33 64 L37 68 L45 59" stroke={`#2DD4BF`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Linje 3 – uavkrysset */}
      <rect x="32" y="74" width="22" height="4" rx="2" fill="white" opacity="0.35" />
      <circle cx="36" cy="76" r="3" fill="white" opacity="0.3" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

// ─── 3. Innkjøp – handlevogn med poser ────────────────────────────────────────

export function InnkjopIkon({ size = 56, className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <Defs id="ink" />
      <circle cx="50" cy="50" r="50" fill="#EEF2FF" />

      {/* Vogn-kropp */}
      <path d="M18 32 L24 32 L32 64 L72 64 L80 40 L28 40Z" fill={`url(#ink_grad)`} />

      {/* Vogn-bunn (avrundet) */}
      <rect x="30" y="58" width="44" height="10" rx="5" fill={`url(#ink_blue)`} />

      {/* Hjul */}
      <circle cx="38" cy="72" r="6" fill={`url(#ink_purp)`} />
      <circle cx="38" cy="72" r="2.5" fill="white" opacity="0.5" />
      <circle cx="62" cy="72" r="6" fill={`url(#ink_purp)`} />
      <circle cx="62" cy="72" r="2.5" fill="white" opacity="0.5" />

      {/* Handlepose rød/pink */}
      <rect x="38" y="28" width="16" height="26" rx="4" fill={`url(#ink_pink)`} />
      <path d="M42 28 Q42 22 50 22 Q58 22 58 28" fill="none" stroke={`#F472B6`} strokeWidth="3" strokeLinecap="round" />

      {/* Handlepose oransje */}
      <rect x="54" y="32" width="14" height="22" rx="4" fill={`url(#ink_oran)`} />
      <path d="M57 32 Q57 27 63 27 Q69 27 69 32" fill="none" stroke={`#FBBF24`} strokeWidth="3" strokeLinecap="round" />

      {/* Vogn-arm */}
      <line x1="18" y1="32" x2="14" y2="24" stroke={`#8B5CF6`} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

// ─── 4. Eiendeler – hus med tre ───────────────────────────────────────────────

export function EiendelerIkon({ size = 56, className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <Defs id="eid" />
      <circle cx="50" cy="50" r="50" fill="#EEF2FF" />

      {/* Hus-base */}
      <rect x="20" y="50" width="46" height="34" rx="4" fill={`url(#eid_grad)`} />

      {/* Hustak */}
      <path d="M14 54 L43 24 L72 54Z" fill={`url(#eid_purp)`} />

      {/* Vinduer (4 ruter) */}
      <rect x="27" y="58" width="10" height="10" rx="2" fill="white" opacity="0.5" />
      <rect x="40" y="58" width="10" height="10" rx="2" fill="white" opacity="0.5" />
      <rect x="27" y="71" width="10" height="10" rx="2" fill="white" opacity="0.5" />
      <rect x="40" y="71" width="10" height="10" rx="2" fill="white" opacity="0.5" />

      {/* Tre */}
      <rect x="67" y="62" width="6" height="22" rx="3" fill="#8B5CF6" opacity="0.7" />
      <circle cx="70" cy="52" r="16" fill={`url(#eid_teal)`} />
      <circle cx="70" cy="48" r="13" fill={`url(#eid_teal)`} />
    </svg>
  );
}

// ─── 5. Økonomi – lommebok med mynter ─────────────────────────────────────────

export function OkonomIkon({ size = 56, className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} xmlns="http://www.w3.org/2000/svg">
      <Defs id="ok" />
      <circle cx="50" cy="50" r="50" fill="#EEF2FF" />

      {/* Lommebok body */}
      <rect x="22" y="34" width="54" height="38" rx="8" fill={`url(#ok_grad)`} />

      {/* Lommebok flap / kortlomme */}
      <rect x="52" y="42" width="20" height="22" rx="6" fill="white" opacity="0.2" />
      <circle cx="64" cy="53" r="5.5" fill="white" opacity="0.35" />

      {/* Kortstripe */}
      <rect x="22" y="42" width="54" height="8" rx="0" fill="white" opacity="0.1" />

      {/* Mynthaug */}
      {/* Mynt 3 (bakre) */}
      <ellipse cx="30" cy="64" rx="12" ry="4" fill={`url(#ok_gold)`} opacity="0.7" />
      <rect x="18" y="56" width="24" height="8" rx="0" fill={`url(#ok_gold)`} opacity="0.7" />
      <ellipse cx="30" cy="56" rx="12" ry="4" fill="#FCD34D" opacity="0.8" />

      {/* Mynt 2 */}
      <ellipse cx="30" cy="58" rx="12" ry="4" fill={`url(#ok_gold)`} opacity="0.85" />
      <rect x="18" y="50" width="24" height="8" rx="0" fill={`url(#ok_gold)`} opacity="0.85" />
      <ellipse cx="30" cy="50" rx="12" ry="4" fill="#FDE68A" />

      {/* Mynt 1 (fremst) */}
      <ellipse cx="30" cy="52" rx="12" ry="4" fill={`url(#ok_gold)`} />
      <rect x="18" y="44" width="24" height="8" rx="0" fill={`url(#ok_gold)`} />
      <ellipse cx="30" cy="44" rx="12" ry="4" fill="#FDE68A" />
      <text x="30" y="47" textAnchor="middle" fontSize="7" fontWeight="800" fill="#B45309" fontFamily="sans-serif">kr</text>
    </svg>
  );
}

export function MiddagIkon({ size = 48, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect width="48" height="48" rx="14" fill="#EDE9FE" />
      <defs>
        <linearGradient id="middag_g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id="middag_g2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      {/* Tallerken */}
      <ellipse cx="24" cy="30" rx="13" ry="3.5" fill="url(#middag_g1)" opacity="0.2" />
      <ellipse cx="24" cy="28" rx="12" ry="2" fill="url(#middag_g1)" opacity="0.15" />
      {/* Bolle */}
      <path d="M13 24 C13 17 35 17 35 24 Q35 31 24 31 Q13 31 13 24Z" fill="url(#middag_g1)" />
      {/* Glans */}
      <path d="M17 21 Q24 18 31 21" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* Damp */}
      <path d="M20 15 Q21 12 20 10" stroke="url(#middag_g2)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M24 14 Q25 11 24 9" stroke="url(#middag_g2)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M28 15 Q29 12 28 10" stroke="url(#middag_g2)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}
