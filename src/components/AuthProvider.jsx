"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthChange, checkIsAdmin, getUserProfile } from "@/lib/auth";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthChange(async (u) => {
      if (u) {
        setUser(u);
        const [prof, admin] = await Promise.all([
          getUserProfile(u.uid),
          checkIsAdmin(u.uid)
        ]);
        setProfile(prof);
        setIsAdmin(admin);
      } else {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
  }, []);

  return (
    <Ctx.Provider value={{ user, profile, setProfile, isAdmin, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}