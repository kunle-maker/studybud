import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import type { User } from "@/lib/auth";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { loginWithOAuth } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const err = params.get("error");
    if (err) {
      setError(decodeURIComponent(err));
      setTimeout(() => setLocation("/login"), 3000);
      return;
    }

    const accessToken  = params.get("accessToken");
    const refreshToken = params.get("refreshToken") ?? "";
    const userId       = params.get("userId") ?? "";
    const name         = params.get("name") ?? "User";
    const role         = (params.get("role") ?? "free") as "free" | "premium";

    if (!accessToken) {
      setError("Missing authentication token.");
      setTimeout(() => setLocation("/login"), 3000);
      return;
    }

    const u: User = { _id: userId, name, role, profilePicture: null };
    loginWithOAuth(accessToken, refreshToken, u);
    setLocation("/");
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #0047cc 0%, #0066f5 45%, #5b21b6 100%)" }}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(12px)" }}
        >
          <i className="fa-solid fa-graduation-cap text-white text-2xl" />
        </div>

        {error ? (
          <div>
            <i className="fa-solid fa-circle-exclamation text-3xl text-red-400 mb-3 block" />
            <p className="text-white text-sm font-medium">{error}</p>
            <p className="text-white/50 text-xs mt-1">Redirecting to login…</p>
          </div>
        ) : (
          <>
            <span className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white/70 text-sm">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
}
