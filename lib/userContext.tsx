"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, setAuthCookies, clearAuthCookies, getCookie, AUTH_COOKIE_ACCESS, AUTH_COOKIE_REFRESH } from "@/lib/supabase/client";
import type { FamilyMember } from "./types";

// ─── Context type ─────────────────────────────────────────────────────────────

type AuthContextType = {
  /** Supabase Auth-bruker */
  user: User | null;
  /** Familiemedlems-profilen koblet til brukeren */
  familyMember: FamilyMember | null;
  /** UUID til familien – brukes for inserts i klientkode */
  familyId: string | null;
  /** true når initial auth-sjekk er ferdig */
  isLoaded: boolean;
  /** Logger ut og rydder cookies */
  signOut: () => Promise<void>;

  // Bakoverkompatibilitet
  currentUser: FamilyMember | null;
  setCurrentUser: (m: FamilyMember | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  familyMember: null,
  familyId: null,
  isLoaded: false,
  signOut: async () => {},
  currentUser: null,
  setCurrentUser: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                   = useState<User | null>(null);
  const [familyMember, setFamilyMember]   = useState<FamilyMember | null>(null);
  const [familyId, setFamilyId]           = useState<string | null>(null);
  const [isLoaded, setIsLoaded]           = useState(false);

  const loadMemberData = useCallback(
    async (authUser: User, accessToken: string, refreshToken: string) => {
      setAuthCookies(accessToken, refreshToken);

      const { data: member } = await supabase
        .from("family_members")
        .select("*")
        .eq("user_id", authUser.id)
        .single();

      setFamilyMember((member as FamilyMember) ?? null);
      setFamilyId((member as FamilyMember | null)?.family_id ?? null);
    },
    []
  );

  useEffect(() => {
    // Supabase lagrer IKKE lenger sesjonen selv (persistSession: false).
    // Vi må derfor selv gjenopprette den fra våre egne cookies ved oppstart.
    // Dette er med hensikt – se kommentar i lib/supabase/client.ts.
    const bootstrap = async () => {
      const accessToken = getCookie(AUTH_COOKIE_ACCESS);
      const refreshToken = getCookie(AUTH_COOKIE_REFRESH);

      if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error && data.session?.user) {
            setUser(data.session.user);
            await loadMemberData(data.session.user, data.session.access_token, data.session.refresh_token);
          } else {
            // Ugyldig/utløpt sesjon – rydd opp slik at vi ikke sitter fast
            clearAuthCookies();
          }
        } catch {
          clearAuthCookies();
        }
      }

      setIsLoaded(true);
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await loadMemberData(session.user, session.access_token, session.refresh_token);
        } else {
          setUser(null);
          setFamilyMember(null);
          setFamilyId(null);
          clearAuthCookies();
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthCookies();
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        familyMember,
        familyId,
        isLoaded,
        signOut,
        currentUser: familyMember,
        setCurrentUser: setFamilyMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useUser = () => useContext(AuthContext);
export const useAuth = () => useContext(AuthContext);
