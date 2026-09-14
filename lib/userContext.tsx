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
import { supabase, setAuthCookies, clearAuthCookies } from "@/lib/supabase/client";
import type { FamilyMember } from "./types";

// ─── Context type ─────────────────────────────────────────────────────────────

type AuthContextType = {
  user: User | null;
  familyMember: FamilyMember | null;
  familyId: string | null;
  isLoaded: boolean;
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
    // Supabase sin egen getSession() leser fra lokal lagring (localStorage)
    // og gjør IKKE et nettverkskall med mindre sesjonen faktisk er utløpt.
    // Dette er raskt og pålitelig – i motsetning til å manuelt kalle
    // setSession() med tokens fra våre egne cookies, som viste seg å kunne
    // henge i produksjon.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await loadMemberData(session.user, session.access_token, session.refresh_token);
      }
      setIsLoaded(true);
    }).catch(() => {
      setIsLoaded(true);
    });

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
