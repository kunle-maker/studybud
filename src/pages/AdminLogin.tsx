import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import api from "@/lib/api";

export default function AdminLogin() {
  const { user, loginWithOAuth } = useAuth();
  const [, setLocation]          = useLocation();
  const { theme, toggle }        = useTheme();
  const [email,    setEmail]    = useState("");
  const [password, setPassword]  = useState("");
  const [showPass, setShowPass]  = useState(false);
  const [error, setError]        = useState("");
  const [loading, setLoading]    = useState(false);
  const isDark = theme === "dark";

  useEffect(() => {
    if (user?.isAdmin) setLocation("/admin");
    else if (user) setLocation("/");
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/admin-login", { email: email.trim(), password });
      if (data.success) {
        loginWithOAuth(data.data.accessToken, data.data.refreshToken, data.data.user);
        setLocation("/admin");
      } else {
        setError(data.message || "Login failed.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid credentials. Access denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes alFloat1 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.14; }
          50%       { transform: translateY(-20px) rotate(5deg); opacity: 0.24; }
        }
        @keyframes alFloat2 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.1; }
          50%       { transform: translateY(-14px) rotate(-4deg); opacity: 0.18; }
        }
        @keyframes alFloat3 {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.08; }
          33%       { transform: translateY(-18px) rotate(3deg); opacity: 0.16; }
          66%       { transform: translateY(-8px) rotate(-2deg); opacity: 0.12; }
        }
        @keyframes adminPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.3); }
          50%       { box-shadow: 0 0 0 14px rgba(52,211,153,0); }
        }
        @keyframes alSpinBadge {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
        style={{
          background: isDark
            ? "linear-gradient(135deg, #0a1a0a 0%, #0f2d0f 40%, #1a1a0a 100%)"
            : "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #1a4731 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #34d399 0%, transparent 70%)" }} />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #fbbf24 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 -right-20 w-64 h-64 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 70%)" }} />
        </div>

        {/* Floating WC logos */}
        <img
          src="/wc-logo.svg"
          alt="" aria-hidden
          className="absolute w-20 h-20 top-14 left-10 pointer-events-none select-none"
          style={{ animation: "alFloat1 4.5s ease-in-out infinite", filter: "brightness(0) invert(1)" }}
        />
        <img
          src="/wc-badge.svg"
          alt="" aria-hidden
          className="absolute w-12 h-12 top-1/3 right-14 pointer-events-none select-none"
          style={{ animation: "alFloat2 5.5s ease-in-out infinite 1s", filter: "brightness(0) invert(1)" }}
        />
        <img
          src="/wc-logo.svg"
          alt="" aria-hidden
          className="absolute w-14 h-14 bottom-20 left-1/4 pointer-events-none select-none"
          style={{ animation: "alFloat3 6.5s ease-in-out infinite 0.6s", filter: "brightness(0) invert(1)" }}
        />

        {/* Theme toggle */}
        <button onClick={toggle} aria-label="Toggle theme"
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all"
          style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(12px)", color: "white" }}>
          <i className={`fa-solid ${isDark ? "fa-sun" : "fa-moon"} text-sm`} />
        </button>

        <div className="w-full max-w-sm relative z-10">
          {/* Logo / Header */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.3)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                animation: "adminPulse 2.5s ease-in-out infinite",
              }}
            >
              <i className="fa-solid fa-shield-halved text-white text-2xl" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5">Admin Access</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              StudyBud · Secure Control Centre
            </p>
            {/* WC badge pill */}
            <div className="flex items-center gap-2 mt-2.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.35)" }}>
              <img
                src="/wc-badge-dark.svg"
                alt="FIFA World Cup 2026"
                className="w-5 h-5 object-contain"
                style={{ animation: "alSpinBadge 6s linear infinite" }}
              />
              <span className="text-xs font-semibold" style={{ color: "#fbbf24" }}>World Cup 2026</span>
            </div>
          </div>

          {/* Glass card */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl p-8 space-y-4"
            style={{
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)",
            }}
          >
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5" }}>
                <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
              </div>
            )}

            <p className="text-xs font-semibold uppercase tracking-widest text-center"
              style={{ color: "rgba(255,255,255,0.45)" }}>Enter admin credentials</p>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <i className="fa-solid fa-envelope text-sm" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-sm font-medium placeholder:font-normal outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", caretColor: "white", color: "white" }}
                  onFocus={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.45)"; e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
                  onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <i className="fa-solid fa-lock text-sm" />
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-11 py-3 rounded-xl text-sm font-medium placeholder:font-normal outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", caretColor: "white", color: "white" }}
                  onFocus={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.45)"; e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
                  onBlur={e => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                />
                <button
                  type="button" tabIndex={-1} onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  <i className={`fa-solid ${showPass ? "fa-eye-slash" : "fa-eye"} text-sm`} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{
                background: loading
                  ? "rgba(52,211,153,0.4)"
                  : "linear-gradient(135deg, rgba(52,211,153,0.85) 0%, rgba(16,185,129,0.85) 100%)",
                border: "1px solid rgba(52,211,153,0.4)",
                boxShadow: loading ? "none" : "0 4px 20px rgba(52,211,153,0.25)",
              }}
            >
              {loading ? (
                <>
                  <img src="/wc-badge.svg" alt="" aria-hidden className="w-4 h-4 object-contain" style={{ animation: "alSpinBadge 1s linear infinite", filter: "brightness(0) invert(1)" }} />
                  Verifying…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-shield-check text-sm" />
                  Enter Admin Panel
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.35)" }}>
            <i className="fa-solid fa-lock mr-1.5" />
            Restricted access — authorised personnel only
          </p>
        </div>
      </div>
    </>
  );
}
