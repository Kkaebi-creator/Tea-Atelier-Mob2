import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Preferences } from "@capacitor/preferences";
import { API_URL } from "../config/api";

type User = {
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "customer";
  phone: string | null;
  isVerified: boolean;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { value: storedToken } = await Preferences.get({ key: "auth_token" });
      if (!storedToken) { setIsLoading(false); return; }
      try {
        const res = await fetch(`${API_URL}/api/whoami`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setToken(storedToken);
          setUser(data.user);
        } else {
          await Preferences.remove({ key: "auth_token" });
        }
      } catch {
        // network error — stay logged out
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await Preferences.set({ key: "auth_token", value: newToken });
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await Preferences.remove({ key: "auth_token" });
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((current) => current ? { ...current, ...updates } : current);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
