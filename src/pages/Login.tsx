import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import api from "@/lib/api";

const BACKEND = "https://studybud-backend.onrender.com/api/v1";

export default function Login() {
  const { user, loginWithOAuth } = useAuth();
  const [, setLocation]          = useLocation();
  const { theme, toggle }        = useTheme();
  const [error, setError]        = useState("");
  const [tgLoading, setTgLoading]= useState(false);
  const tgRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    if (user) setLocation("/");
  }, [user]);

  useEffect(() => {
    (window as any).onTelegramAuth = async (telegramUser: any) => {
      setTgLoading(true);
      setError("");
      try {
        const { data } = await api.post("/auth/telegram", telegramUser);
        if (data.success) {
          loginWithOAuth(data.data.accessToken, data.data.refreshToken, data.data.user);
          setLocation("/");
        } else {
          setError(data.message || "Telegram login failed.");
        }
      } catch (err: any) {
        setError(err?.response?.data?.message || "Telegram login failed.");
      } finally {
        setTgLoading(false);
      }
    };

    if (tgRef.current && tgRef.current.childElementCount === 0) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.setAttribute("data-telegram-login", "studyhub_auth_bot");
      script.setAttribute("data-size", "medium");
      script.setAttribute("data-radius", "12");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      tgRef.current.appendChild(script);
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, []);

  const githubLogin = () => {
    window.location.href = `${BACKEND}/auth/github`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #0a0f1e 0%, #0d1a3a 40%, #1a0a3e 100%)"
          : "linear-gradient(135deg, #0047cc 0%, #0066f5 40%, #5b21b6 100%)",
      }}
    >
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 70%)" }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }} />
      </div>

      {/* Theme toggle */}
      <button onClick={toggle} aria-label="Toggle theme"
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all"
        style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(12px)", color: "white" }}>
        <i className={`fa-solid ${isDark ? "fa-sun" : "fa-moon"} text-sm`} />
      </button>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <i className="fa-solid fa-graduation-cap text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to StudyBud</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>Sign in to start studying smarter</p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl p-8 space-y-4"
          style={{
            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.22)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5" }}>
              <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
            </div>
          )}

          <p className="text-xs font-semibold uppercase tracking-widest text-center"
            style={{ color: "rgba(255,255,255,0.45)" }}>Continue with</p>

          {/* GitHub */}
          <button
            data-testid="btn-github"
            onClick={githubLogin}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="white" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
          </div>

          {/* Telegram widget */}
          <div className="flex flex-col items-center gap-2">
            {tgLoading ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting with Telegram…
              </div>
            ) : (
              <div ref={tgRef} className="flex justify-center" />
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
          </div>

          {/* Email login link */}
          <button
            onClick={() => setLocation("/login/email")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.85)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
          >
            <i className="fa-solid fa-envelope text-sm" />
            Login another way
          </button>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.45)" }}>
          By signing in you agree to our terms of service. Your account is created automatically on first login.
        </p>
      </div>
    </div>
  );
}
