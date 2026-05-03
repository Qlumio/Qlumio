"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { FamilyMember } from "./types";

type UserContextType = {
  currentUser: FamilyMember | null;
  setCurrentUser: (member: FamilyMember | null) => void;
  isLoaded: boolean;
};

const UserContext = createContext<UserContextType>({
  currentUser: null,
  setCurrentUser: () => {},
  isLoaded: false,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<FamilyMember | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("qlumio_current_user");
    if (stored) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentUserState(JSON.parse(stored));
      } catch {
        localStorage.removeItem("qlumio_current_user");
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(true);
  }, []);

  const setCurrentUser = (member: FamilyMember | null) => {
    setCurrentUserState(member);
    if (member) {
      localStorage.setItem("qlumio_current_user", JSON.stringify(member));
    } else {
      localStorage.removeItem("qlumio_current_user");
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, isLoaded }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
