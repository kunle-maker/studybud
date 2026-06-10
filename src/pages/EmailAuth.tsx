import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import api from "@/lib/api";

export default function EmailAuth() {
  const { user, loginWithOAuth } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (user) setLocation("/");
  }, [user]);

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    const { data } = await api.post("/auth/login", {
      email: loginEmail,
      password: loginPassword,
    });
    if (data.success) {
      loginWithOAuth(data.data.accessToken, data.data.refreshToken, data.data.user);
    } else {
      throw new Error(data.message || "Login failed.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatusMsg("");
    setLoading(true);
    try {
      if (mode === "register") {
        const { data } = await api.post("/auth/register", { email, password, name });
        if (data.success || data.message?.toLowerCase().includes("success")) {
          setStatusMsg("Account created! Signing you inâ€¦");
          await doLogin(email, password);
        } else {
          throw new Error(data.message || "Registration failed.");
        }
      } else {
        await doLogin(email, password);
      }
    } catch (err: any) {
      const msgs: string[] = err?.response?.data?.errors?.map((e: any) => e.msg) ?? [];
      setError(
        msgs.length
          ? msgs.join(" Â· ")
          : err?.response?.data?.message || err?.message || "Something went wrong."
      );
      setStatusMsg("");
    } finally {
      setLoading(false);
    }
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

      {/* Back button */}
      <button onClick={() => setLocation("/login")} aria-label="Back to login"
        className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center transition-all"
        style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(12px)", color: "white" }}>
        <i className="fa-solid fa-arrow-left text-sm" />
      </button>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <i className="fa-solid fa-envelope text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === "login" ? "Sign in" : "Create account"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
            {mode === "login" ? "Welcome back to StudyBud" : "Join StudyBud and study smarter"}
          </p>
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
          {/* Mode tabs */}
          <div className="flex rounded-xl p-1" style={{ background: "rgba(0,0,0,0.2)" }}>
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setStatusMsg(""); }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                style={mode === m
                  ? { background: "rgba(255,255,255,0.18)", color: "white" }
                  : { color: "rgba(255,255,255,0.5)" }
                }
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Status message (e.g. "Account created! Signing you inâ€¦") */}
          {statusMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac" }}>
              <span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin flex-shrink-0" />
              {statusMsg}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm"
              style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5" }}>
              <i className="fa-solid fa-circle-exclamation flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  autoComplete="name"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:opacity-40 focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
                  onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.45)"; }}
                  onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)"; }}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:opacity-40 focus:outline-none transition-all"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
                onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.45)"; }}
                onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)"; }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                Password{mode === "register" && <span className="font-normal opacity-60"> (min. 6 characters)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  required
                  minLength={6}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder:opacity-40 focus:outline-none transition-all"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
                  onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.45)"; }}
                  onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{ background: "hsl(217 91% 48%)", boxShadow: "0 4px 16px rgba(37,99,235,0.4)" }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "hsl(217 91% 55%)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(217 91% 48%)"; }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === "login" ? "Signing inâ€¦" : "Creating accountâ€¦"}
                </>
              ) : (
                <>{mode === "login" ? "Sign In" : "Create Account"}</>
              )}
            </button>
          </form>

          <p className="text-center text-xs pt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setStatusMsg(""); }}
              className="underline underline-offset-2 font-semibold transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              {mode === "login" ? "Register" : "Sign in"}
            </button>
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.45)" }}>
          By signing in you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}