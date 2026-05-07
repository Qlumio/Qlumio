import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { AUTH_COOKIE_ACCESS, AUTH_COOKIE_REFRESH } from "./client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-klient for Server Components og Server Actions.
 * Leser JWT fra cookies og setter session slik at RLS fungerer.
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  const accessToken  = cookieStore.get(AUTH_COOKIE_ACCESS)?.value;
  const refreshToken = cookieStore.get(AUTH_COOKIE_REFRESH)?.value;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (accessToken && refreshToken) {
    await client.auth.setSession({
      access_token:  decodeURIComponent(accessToken),
      refresh_token: decodeURIComponent(refreshToken),
    });
  }

  return client;
}
