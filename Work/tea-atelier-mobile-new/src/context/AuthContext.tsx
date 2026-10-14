import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Preferences } from "@capacitor/preferences";
import { fetchApi } from "../config/request";
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
  sessionError: string;
  retrySession: () => Promise<void>;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [sessionError, setSessionError] = useState("");

  const retrySession = useCallback(async () => {
    setIsLoading(true);
    setSessionError("");
    try {
      const { value: storedToken } = await Preferences.get({
        key: "auth_token",
      });
      if (!storedToken) return;
      const res = await fetchApi(`${API_URL}/api/whoami`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      if (res.status === 401 || res.status === 403) {
        await Preferences.remove({ key: "auth_token" });
        setToken(null);
        setUser(null);
      } else if (res.ok) {
        const data = await res.json();
        setToken(storedToken);
        setUser(data.user);
      } else {
        throw new Error("Session service unavailable");
      }
    } catch {
      setSessionError(
        "Unable to check your saved sign-in. Check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void retrySession();
  }, [retrySession]);

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
    setUser((current) => (current ? { ...current, ...updates } : current));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        sessionError,
        retrySession,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
