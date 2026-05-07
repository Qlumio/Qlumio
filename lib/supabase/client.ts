import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser-klient – brukes i Client Components
// Supabase lagrer session i localStorage og vi speilar den til cookies
// slik at server-komponenter kan lese den.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
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
