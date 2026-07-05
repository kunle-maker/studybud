import { useEffect, useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import api from "@/lib/api";

const BACKEND = "https://studybud-backend.onrender.com/api/v1";

export default function Login() {
  const { user, loginWithOAuth } = useAuth();
  const [, setLocation]          = useLocation();
  const search                   = useSearch();
  const { theme, toggle }        = useTheme();
  const isDark                   = theme === "dark";

  // Respect ?redirect= param so shared assignment links land correctly after auth
  const redirectTo = new URLSearchParams(search).get("redirect") || "/";

  const [mode, setMode]               = useState<"login" | "register">("login");
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [statusMsg, setStatusMsg]     = useState("");
  const [tgLoading, setTgLoading]     = useState(false);
  const [showTgPopover, setShowTgPopover] = useState(false);

  const tgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) setLocation(redirectTo);
  }, [user]);

  useEffect(() => {
    (window as any).onTelegramAuth = async (telegramUser: any) => {
      setTgLoading(true);
      setShowTgPopover(false);
      setError("");
      try {
        const { data } = await api.post("/auth/telegram", telegramUser);
        if (data.success) {
          loginWithOAuth(data.data.accessToken, data.data.refreshToken, data.data.user);
          setLocation(redirectTo);
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
      script.setAttribute("data-radius", "10");
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      script.setAttribute("data-request-access", "write");
      script.async = true;
      tgRef.current.appendChild(script);
    }

    return () => { delete (window as any).onTelegramAuth; };
  }, []);

  const githubLogin = () => { window.location.href = `${BACKEND}/auth/github`; };

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    const { data } = await api.post("/auth/login", { email: loginEmail, password: loginPassword });
    if (data.success) {
      loginWithOAuth(data.data.accessToken, data.data.refreshToken, data.data.user);
    } else {
      throw new Error(data.message || "Login failed.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setStatusMsg(""); setLoading(true);
    try {
      if (mode === "register") {
        const { data } = await api.post("/auth/register", { email, password, name });
        if (data.success || data.message?.toLowerCase().includes("success")) {
          setStatusMsg("Account created! Signing you in…");
          await doLogin(email, password);
        } else {
          throw new Error(data.message || "Registration failed.");
        }
      } else {
        await doLogin(email, password);
      }
    } catch (err: any) {
      const msgs: string[] = err?.response?.data?.errors?.map((e: any) => e.msg) ?? [];
      setError(msgs.length ? msgs.join(" · ") : err?.response?.data?.message || err?.message || "Something went wrong.");
      setStatusMsg("");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.5)";
    e.currentTarget.style.background = "rgba(255,255,255,0.14)";
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)";
    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
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
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #38bdf8 0%, transparent 70%)" }} />
      </div>

      {/* Theme toggle */}
      <button onClick={toggle} aria-label="Toggle theme"
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all"
        style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(12px)", color: "white" }}>
        <i className={`fa-solid ${isDark ? "fa-sun" : "fa-moon"} text-sm`} />
      </button>

      <div className="w-full max-w-sm relative z-10">

        {/* Wordmark */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
            <i className="fa-solid fa-graduation-cap text-white text-2xl" />
          </div>
          <h1 className="text-[1.6rem] font-bold tracking-tight text-white leading-tight">Welcome to StudyBud</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.58)" }}>Sign in to start studying smarter</p>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl px-7 pt-6 pb-7 space-y-4"
          style={{
            background: isDark ? "rgba(255,255,255,0.065)" : "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.14)",
          }}
        >
          {/* Sign In / Register tab */}
          <div className="flex rounded-xl p-1" style={{ background: "rgba(0,0,0,0.22)" }}>
            {(["login", "register"] as const).map((m) => (
              <button key={m}
                onClick={() => { setMode(m); setError(""); setStatusMsg(""); }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                style={mode === m
                  ? { background: "rgba(255,255,255,0.18)", color: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }
                  : { color: "rgba(255,255,255,0.45)" }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Banners */}
          {statusMsg && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: "rgba(34,197,94,0.14)", border: "1px solid rgba(34,197,94,0.28)", color: "#86efac" }}>
              <span className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin flex-shrink-0" />
              {statusMsg}
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm"
              style={{ background: "rgba(239,68,68,0.18)", border: "1px solid rgba(239,68,68,0.32)", color: "#fca5a5" }}>
              <i className="fa-solid fa-circle-exclamation flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Your name" required autoComplete="name"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none transition-all"
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" required autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none transition-all"
                style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                Password
                {mode === "register" && <span className="font-normal" style={{ color: "rgba(255,255,255,0.35)" }}> · min. 6 characters</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" required minLength={6}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none transition-all"
                  style={inputStyle} onFocus={inputFocus} onBlur={inputBlur} />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(255,255,255,0.38)" }}>
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-55 disabled:cursor-not-allowed"
              style={{ background: "hsl(217 91% 50%)", boxShadow: "0 4px 18px rgba(37,99,235,0.45)" }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "hsl(217 91% 57%)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(217 91% 50%)"; }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{mode === "login" ? "Signing in…" : "Creating account…"}</>
                : mode === "login" ? "Sign In" : "Create Account"
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
            <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.32)" }}>or continue with</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>

          {/* OAuth icon row */}
          <div className="flex items-center justify-center gap-5">

            {/* GitHub */}
            <button onClick={githubLogin} title="Continue with GitHub"
              className="w-11 h-11 rounded-full flex items-center justify-center transition-all group"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.35)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)"; }}>
              <svg className="w-[18px] h-[18px]" fill="white" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </button>

            {/* Telegram */}
            {tgLoading ? (
              <div className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : (
              <div className="relative">
                {/* Telegram popover — always mounted so ref can load the script */}
                <div
                  style={{
                    display: showTgPopover ? "block" : "none",
                    position: "absolute",
                    bottom: "calc(100% + 10px)",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(15,23,42,0.92)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    borderRadius: "14px",
                    padding: "12px 14px 10px",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    zIndex: 50,
                    whiteSpace: "nowrap",
                  }}>
                  <p className="text-xs font-medium mb-2 text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
                    Tap to continue
                  </p>
                  <div ref={tgRef} className="flex justify-center" />
                  {/* small caret */}
                  <div style={{
                    position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
                    width: 12, height: 12, background: "rgba(15,23,42,0.92)",
                    border: "1px solid rgba(255,255,255,0.18)", borderTop: "none", borderLeft: "none",
                    borderRadius: "0 0 3px 0", rotate: "45deg",
                  }} />
                </div>

                <button
                  title="Continue with Telegram"
                  onClick={() => setShowTgPopover((v) => !v)}
                  className="w-11 h-11 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: showTgPopover ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                    border: showTgPopover ? "1px solid rgba(255,255,255,0.38)" : "1px solid rgba(255,255,255,0.2)",
                  }}
                  onMouseEnter={(e) => { if (!showTgPopover) { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.35)"; } }}
                  onMouseLeave={(e) => { if (!showTgPopover) { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.2)"; } }}>
                  {/* Telegram paper-plane */}
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="white">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Shared-link nudge */}
          {redirectTo !== "/" ? (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(99,179,237,0.12)", border: "1px solid rgba(99,179,237,0.25)" }}>
              <i className="fa-solid fa-link text-sky-300 text-xs mt-0.5 flex-shrink-0" />
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                Sign in to open your shared assignment link.
              </p>
            </div>
          ) : (
            <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
              <i className="fa-solid fa-link mr-1.5" />
              Got a shared assignment link? Sign in and it'll open automatically.
            </p>
          )}
        </div>

        <p className="text-center text-[11px] mt-5" style={{ color: "rgba(255,255,255,0.32)" }}>
          By signing in you agree to our{" "}
          <span className="underline underline-offset-2" style={{ color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>terms of service</span>.
          {" "}Your account is created automatically on first login.
        </p>
      </div>
    </div>
  );
}
