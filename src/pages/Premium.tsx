import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import Emoji from "@/components/Emoji";

const features = [
  { icon: "fa-bolt",             label: "Unlimited Summaries" },
  { icon: "fa-chalkboard-user",  label: "Unlimited TeachBuddy" },
  { icon: "fa-lightbulb",        label: "Unlimited Topic Explainer" },
  { icon: "fa-cards-blank",      label: "Unlimited Flashcards" },
  { icon: "fa-circle-question",  label: "Unlimited Quizzes" },
  { icon: "fa-camera",           label: "Unlimited OCR Scans" },
  { icon: "fa-palette",          label: "All 6 Teaching Styles" },
  { icon: "fa-clipboard-list",   label: "AI Assignments" },
  { icon: "fa-magnifying-glass", label: "Past Questions Search" },
];

const accountDetails = [
  { label: "Bank",           value: "SmartCash MFB",  mono: false },
  { label: "Account Name",   value: "Ayodele Ganiyu", mono: false },
  { label: "Account Number", value: "9012834275",     mono: true  },
];

function WCAnimations() {
  return (
    <style>{`
      @keyframes wcFloat1 {
        0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.22; }
        50%       { transform: translateY(-18px) rotate(6deg); opacity: 0.35; }
      }
      @keyframes wcFloat2 {
        0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.15; }
        50%       { transform: translateY(-22px) rotate(-5deg); opacity: 0.25; }
      }
      @keyframes wcFloat3 {
        0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.12; }
        33%       { transform: translateY(-16px) rotate(4deg); opacity: 0.22; }
        66%       { transform: translateY(-8px) rotate(-3deg); opacity: 0.18; }
      }
      @keyframes wcSpin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes wcPulseGold {
        0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.25); }
        50%       { box-shadow: 0 0 0 10px rgba(251,191,36,0); }
      }
      @keyframes wcSlideIn {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .wc-promo-banner { animation: wcSlideIn 0.5s ease-out both; }
    `}</style>
  );
}

export default function Premium() {
  const { user, refreshUser } = useAuth();
  const [checking,      setChecking]      = useState(false);
  const [statusMsg,     setStatusMsg]     = useState("");
  const [statusOk,      setStatusOk]      = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [uploadMsg,     setUploadMsg]     = useState("");
  const [uploadOk,      setUploadOk]      = useState(false);
  const [uploadDetails, setUploadDetails] = useState<any>(null);
  const [copied,        setCopied]        = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isPremium = user?.role === "premium";

  const handleCopy = async () => {
    await navigator.clipboard.writeText("9012834275");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const checkStatus = async () => {
    setChecking(true); setStatusMsg(""); setStatusOk(false);
    try {
      const { data } = await api.get("/subscriptions/status");
      if (data.data.role === "premium") {
        setStatusOk(true);
        setStatusMsg("Your account has been upgraded to Premium!");
        await refreshUser();
      } else {
        setStatusMsg("Payment not confirmed yet. Upload your receipt below if you haven't already.");
      }
    } catch {
      setStatusMsg("Could not check status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadMsg(""); setUploadOk(false); setUploadDetails(null);
    try {
      const form = new FormData();
      form.append("receipt", file);
      const { data } = await api.post("/subscriptions/submit-receipt", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadOk(true);
      setUploadDetails(data.data);
      setUploadMsg(data.message || "Payment verified! Upgraded to Premium.");
      await refreshUser();
    } catch (err: any) {
      setUploadOk(false);
      const d = err?.response?.data;
      setUploadMsg(d?.reason || d?.message || "Receipt verification failed. Please try again.");
      if (d?.detected) setUploadDetails(d);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /* ─── Premium active view ─────────────────────────────────────────────── */
  if (isPremium) {
    return (
      <div className="max-w-lg space-y-5">
        <WCAnimations />
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-8 text-center space-y-2 relative overflow-hidden" style={{
            background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, transparent 60%)"
          }}>
            <img
              src="/wc-badge.svg"
              alt="" aria-hidden
              className="absolute -top-5 -right-5 w-24 h-24 pointer-events-none select-none"
              style={{ animation: "wcFloat1 4.5s ease-in-out infinite", opacity: 0.18 }}
            />
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.28)", animation: "wcPulseGold 2.5s ease-in-out infinite" }}>
              <i className="fa-solid fa-crown text-amber-400 text-2xl" />
            </div>
            <h1 className="text-2xl font-black text-foreground">You&rsquo;re on Premium</h1>
            <p className="text-muted-foreground text-sm">Unlimited access to every StudyBud AI feature.</p>
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-xs font-semibold text-emerald-300"
              style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Premium Active
            </div>
          </div>

          <div className="border-t border-border p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">What you have access to</p>
            <div className="grid grid-cols-2 gap-2">
              {features.map(f => (
                <div key={f.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.15)" }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(52,211,153,0.15)" }}>
                    <i className={`fa-solid ${f.icon} text-emerald-400 text-xs`} />
                  </div>
                  <span className="text-xs font-medium text-foreground">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <i className="fa-solid fa-shield-check text-emerald-400 mr-1.5" />
          Keep studying hard — you&rsquo;ve got full access.
        </p>
      </div>
    );
  }

  /* ─── Free user view ──────────────────────────────────────────────────── */
  return (
    <div className="max-w-xl space-y-5">
      <WCAnimations />

      {/* ── World Cup Promo Banner ────────────────────────────────────── */}
      <div
        className="wc-promo-banner relative rounded-2xl overflow-hidden p-5"
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
          border: "1px solid rgba(52,211,153,0.35)",
          boxShadow: "0 4px 24px rgba(5,150,105,0.2)",
        }}
      >
        {/* Floating WC badge decorations */}
        <img
          src="/wc-badge.svg"
          alt="" aria-hidden
          className="absolute -top-4 -right-4 w-24 h-24 pointer-events-none select-none"
          style={{ animation: "wcFloat1 4s ease-in-out infinite", opacity: 0.22, filter: "brightness(0) invert(1)" }}
        />
        <img
          src="/wc-badge.svg"
          alt="" aria-hidden
          className="absolute bottom-1 right-24 w-12 h-12 pointer-events-none select-none"
          style={{ animation: "wcFloat2 5.5s ease-in-out infinite 1.2s", opacity: 0.14, filter: "brightness(0) invert(1)" }}
        />
        <img
          src="/wc-badge.svg"
          alt="" aria-hidden
          className="absolute top-2 left-[55%] w-9 h-9 pointer-events-none select-none"
          style={{ animation: "wcFloat3 6.5s ease-in-out infinite 0.4s", opacity: 0.12, filter: "brightness(0) invert(1)" }}
        />

        <div className="relative z-10 flex items-center gap-4">
          {/* WC logo as the main icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <img
              src="/wc-logo.svg"
              alt="FIFA World Cup 2026"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="flex items-center gap-1 text-xs font-bold text-amber-300 uppercase tracking-widest">
                <Emoji char="🏆" size={13} />
                World Cup Promo
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(251,191,36,0.25)", border: "1px solid rgba(251,191,36,0.4)", color: "#fcd34d" }}>
                Limited Time
              </span>
            </div>
            <p className="text-white font-bold text-base leading-tight">
              Special promo price — valid until the World Cup ends!
            </p>
            <p className="text-emerald-200/70 text-xs mt-0.5 flex items-center gap-1">
              <Emoji char="⚽" size={12} />
              Celebrate the beautiful game with unlimited studying
            </p>
          </div>
        </div>

        {/* Pitch lines decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" style={{ opacity: 0.06 }}>
          <div className="absolute inset-x-0 top-1/2 h-px bg-white" />
          <div className="absolute top-1/4 bottom-1/4 left-1/2 w-px bg-white" />
          <div className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full border border-white -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upgrade to Premium</h1>
        <p className="text-muted-foreground text-sm mt-1">No limits. No daily caps. Just you and your studies.</p>
      </div>

      {/* ── Pricing + features ─────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border relative overflow-hidden">
          {/* WC badge watermark */}
          <img
            src="/wc-badge.svg"
            alt="" aria-hidden
            className="absolute -bottom-5 -right-5 w-32 h-32 pointer-events-none select-none"
            style={{ animation: "wcFloat2 5s ease-in-out infinite", opacity: 0.05 }}
          />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Premium Plan</p>
                <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }}>
                  <img src="/wc-badge.svg" alt="" aria-hidden className="w-3 h-3 object-contain" />
                  WC Promo
                </span>
              </div>
              <div className="flex items-center gap-2 leading-none">
                <div className="flex items-start gap-1">
                  <span className="text-lg font-bold text-primary mt-0.5">₦</span>
                  <span className="text-5xl font-black text-foreground">200</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs line-through text-muted-foreground/60 font-medium">₦1,000</span>
                  <span className="text-xs font-bold text-emerald-400">80% OFF</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">30-day access · renews manually</p>
            </div>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", animation: "wcPulseGold 2.5s ease-in-out infinite" }}>
              <i className="fa-solid fa-crown text-amber-400 text-2xl" />
            </div>
          </div>
        </div>
        <div className="p-5 grid grid-cols-2 gap-2">
          {features.map(f => (
            <div key={f.label} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(52,211,153,0.15)" }}>
                <i className={`fa-solid ${f.icon} text-emerald-400`} style={{ fontSize: "10px" }} />
              </div>
              <span className="text-xs text-foreground">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 1: Transfer ───────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">1</span>
          <p className="text-sm font-semibold text-foreground">Transfer exactly ₦200</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {accountDetails.map(d => (
              <div key={d.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{d.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold text-foreground ${d.mono ? "font-mono tracking-wider" : ""}`}>
                    {d.value}
                  </span>
                  {d.mono && (
                    <button
                      onClick={handleCopy}
                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      title="Copy account number"
                    >
                      <i className={`fa-solid ${copied ? "fa-check text-emerald-400" : "fa-copy"} text-xs`} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
            <i className="fa-solid fa-circle-info text-amber-400 flex-shrink-0 text-xs mt-0.5" />
            <p className="text-xs text-amber-200/80 leading-relaxed">
              Transfer the exact amount today — receipts older than 24 hours are automatically rejected.
            </p>
          </div>
        </div>
      </div>

      {/* ── Step 2: Upload receipt ─────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">2</span>
          <p className="text-sm font-semibold text-foreground">Upload your receipt screenshot</p>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            The screenshot must clearly show: <strong className="text-foreground">Ayodele Ganiyu</strong> ·{" "}
            <strong className="text-foreground">SmartCash</strong> · <strong className="text-foreground">₦200</strong> · today&rsquo;s date
          </p>

          <label className={`relative flex flex-col items-center justify-center gap-3 w-full py-8 px-4 rounded-xl border-2 border-dashed transition-all cursor-pointer group ${
            uploading ? "border-primary/40 bg-primary/5 cursor-wait" : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleReceiptUpload}
              disabled={uploading}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-wait"
            />
            {uploading ? (
              <>
                <img
                  src="/wc-logo.svg"
                  alt="Verifying…"
                  className="w-12 h-12 object-contain"
                  style={{ animation: "wcSpin 1.4s linear infinite" }}
                />
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Verifying with AI…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This takes a few seconds</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
                  <i className="fa-solid fa-cloud-arrow-up text-primary text-xl" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    Drop screenshot here or tap to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, or WebP</p>
                </div>
              </>
            )}
          </label>

          {uploadMsg && (
            <div className="flex items-start gap-3 p-4 rounded-xl"
              style={{
                background: uploadOk ? "rgba(52,211,153,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${uploadOk ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.2)"}`,
              }}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${uploadOk ? "bg-emerald-400/15" : "bg-red-400/15"}`}>
                {uploadOk
                  ? <Emoji char="🎉" size={16} />
                  : <i className="fa-solid fa-circle-exclamation text-red-400 text-sm" />}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-medium ${uploadOk ? "text-emerald-300" : "text-red-300"}`}>
                  {uploadMsg}
                </p>
                {!uploadOk && uploadDetails?.detected && (
                  <p className="text-xs text-muted-foreground mt-1">
                    AI detected: {uploadDetails.detected.name || "–"} · {uploadDetails.detected.bank || "–"} · {uploadDetails.detected.amount || "–"}
                  </p>
                )}
                {!uploadOk && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Tip: Make sure the receipt clearly shows all 3 details — name, bank, and ₦200 amount.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">Already uploaded and waiting?</p>
            <button
              onClick={checkStatus}
              disabled={checking}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              {checking
                ? <span className="w-3 h-3 border border-primary/30 border-t-primary rounded-full animate-spin" />
                : <i className="fa-solid fa-rotate text-xs" />}
              {checking ? "Checking…" : "Check upgrade status"}
            </button>
          </div>

          {statusMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
              style={{
                background: statusOk ? "rgba(52,211,153,0.08)" : "rgba(251,191,36,0.08)",
                border: `1px solid ${statusOk ? "rgba(52,211,153,0.25)" : "rgba(251,191,36,0.25)"}`,
                color: statusOk ? "rgb(110,231,183)" : "rgb(252,211,77)",
              }}>
              <i className={`fa-solid ${statusOk ? "fa-circle-check" : "fa-circle-exclamation"} flex-shrink-0 mt-0.5`} />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 pb-2">
        <i className="fa-solid fa-lock text-emerald-400" />
        AI-powered receipt verification — StudyBud
        <img
          src="/wc-badge.svg"
          alt="" aria-hidden
          className="w-3.5 h-3.5 inline-block object-contain"
          style={{ animation: "wcSpin 5s linear infinite" }}
        />
      </p>
    </div>
  );
}
