import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-klient – brukes i Client Components
//
// VIKTIG: persistSession er skrudd AV med hensikt.
// Supabase sin egen localStorage-lagring kan bli stående igjen med en
// korrupt/ugyldig sesjon (f.eks. etter at en bruker er slettet og opprettet
// på nytt). Når det skjer, kan Supabase-klienten henge seg opp internt ved
// neste innlogging fordi den prøver å gjenopprette den ugyldige sesjonen
// først. Ved å styre alt selv via våre egne cookies (qlumio-access-token /
// qlumio-refresh-token) unngår vi denne feilklassen helt.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // Deaktiver Chrome sin navigator.locks som kan henge og gi svart skjerm
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
  },
});

export const AUTH_COOKIE_ACCESS  = "qlumio-access-token";
export const AUTH_COOKIE_REFRESH = "qlumio-refresh-token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dager

export function setAuthCookies(accessToken: string, refreshToken: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_ACCESS}=${encodeURIComponent(accessToken)};path=/;SameSite=Lax;max-age=${COOKIE_MAX_AGE}`;
  document.cookie = `${AUTH_COOKIE_REFRESH}=${encodeURIComponent(refreshToken)};path=/;SameSite=Lax;max-age=${COOKIE_MAX_AGE}`;
}

export function clearAuthCookies() {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_COOKIE_ACCESS}=;path=/;max-age=0`;
  document.cookie = `${AUTH_COOKIE_REFRESH}=;path=/;max-age=0`;
}

// Leser en enkelt cookie-verdi client-side. Brukes til å gjenopprette
// sesjonen fra våre egne cookies ved oppstart, siden persistSession er av.
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
