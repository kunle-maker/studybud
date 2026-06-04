import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "./api";

export interface User {
  _id: string;
  name: string;
  email?: string;
  role: "free" | "premium";
  profilePicture: string | null;
  authProvider?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithOAuth: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      const u: User = data.data.user;
      setUser(u);
      localStorage.setItem("user", JSON.stringify(u));
    } catch {
      setUser(null);
      localStorage.removeItem("user");
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) { setLoading(false); return; }
    const cached = localStorage.getItem("user");
    if (cached) {
      try { setUser(JSON.parse(cached)); } catch { /* ignore */ }
    }
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const loginWithOAuth = useCallback((accessToken: string, refreshToken: string, u: User) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithOAuth, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
