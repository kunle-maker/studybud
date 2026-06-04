import { useState } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

const BACKEND = "https://studybud-backend.onrender.com";

const features = [
  { icon: "fa-bolt",            label: "Unlimited Summaries" },
  { icon: "fa-chalkboard-user", label: "Unlimited AI Teacher" },
  { icon: "fa-lightbulb",       label: "Unlimited Topic Explainer" },
  { icon: "fa-cards-blank",     label: "Unlimited Flashcards" },
  { icon: "fa-circle-question", label: "Unlimited Quizzes" },
  { icon: "fa-camera",          label: "Unlimited OCR Scans" },
];

interface SubStatus {
  role: string;
  isPremium: boolean;
  subscription?: {
    status: string;
    expiresAt: string;
    daysRemaining: number;
  };
}

export default function Premium() {
  const { user, refreshUser } = useAuth();
  const [checking,   setChecking]   = useState(false);
  const [statusMsg,  setStatusMsg]  = useState("");
  const [statusOk,   setStatusOk]   = useState(false);
  const [subData,    setSubData]     = useState<SubStatus | null>(null);

  const isPremium = user?.role === "premium";

  const handleUpgrade = () => {
    const token = localStorage.getItem("accessToken");
    window.open(`${BACKEND}/pay?token=${token}`, "_blank");
  };

  const checkStatus = async () => {
    setChecking(true); setStatusMsg(""); setStatusOk(false);
    try {
      const { data } = await api.get("/subscriptions/status");
      setSubData(data.data);
      if (data.data.isPremium) {
        setStatusOk(true);
        setStatusMsg("Your account has been upgraded to Premium! 🎉");
        await refreshUser();
      } else {
        setStatusMsg("Payment not confirmed yet. Make sure you've completed the transfer and uploaded your receipt.");
      }
    } catch {
      setStatusMsg("Could not check status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  if (isPremium) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.25)" }}>
            <i className="fa-solid fa-crown text-amber-400 text-2xl" />
          </div>
          <h1 className="text-xl font-bold text-foreground">You're on Premium!</h1>
          <p className="text-muted-foreground text-sm">Unlimited access to all StudyBud AI features. Keep studying hard!</p>
          {subData?.subscription && (
            <div className="text-xs text-muted-foreground">
              <i className="fa-solid fa-clock mr-1.5" />
              {subData.subscription.daysRemaining} days remaining · expires {new Date(subData.subscription.expiresAt).toLocaleDateString()}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {features.map(f => (
              <div key={f.label} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.2)" }}>
                <i className={`fa-solid ${f.icon} text-emerald-400 text-xs w-4 text-center`} />
                <span className="text-xs font-medium text-emerald-200">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upgrade to Premium</h1>
        <p className="text-muted-foreground text-sm mt-1">Unlock unlimited AI study tools for ₦1,000 / 30 days.</p>
      </div>

      {/* Plan card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-md">
        {/* Price */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Plan</p>
              <h2 className="text-xl font-bold text-foreground">Premium Access</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Unlimited AI · No daily limits</p>
            </div>
            <div className="text-right">
              <div className="flex items-start gap-0.5">
                <span className="text-sm font-bold text-primary mt-1">₦</span>
                <span className="text-4xl font-extrabold text-primary leading-none">1,000</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">30-day access</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-5">
            {features.map(f => (
              <div key={f.label} className="flex items-center gap-2">
                <i className={`fa-solid fa-check text-emerald-400 text-xs`} />
                <span className="text-xs text-foreground">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="p-6 border-b border-border space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">How to upgrade</p>
          {[
            { icon: "fa-arrow-up-right-from-square", text: <>Click <strong>Upgrade Now</strong> — you'll be taken to our secure payment page</> },
            { icon: "fa-paper-plane",               text: <>Transfer <strong>exactly ₦1,000</strong> to the SmartCash MFB account shown</> },
            { icon: "fa-camera",                    text: <>Upload a screenshot of your receipt — AI verifies it instantly</> },
            { icon: "fa-rotate",                    text: <>Come back here and click <strong>Check Status</strong> to activate</> },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <i className={`fa-solid ${step.icon} text-primary text-sm`} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pt-1.5">{step.text}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="p-6 space-y-3">
          <button
            data-testid="btn-upgrade"
            onClick={handleUpgrade}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition-all hover:opacity-90"
            style={{ background: "hsl(217 91% 48%)" }}
          >
            <i className="fa-solid fa-arrow-up-right-from-square" />Upgrade Now — ₦1,000
          </button>

          <button
            data-testid="btn-check-status"
            onClick={checkStatus}
            disabled={checking}
            className="w-full py-3 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {checking
              ? <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Checking…</>
              : <><i className="fa-solid fa-rotate" />I've Already Paid — Check Status</>
            }
          </button>

          {statusMsg && (
            <div className={`flex items-start gap-2.5 p-3.5 rounded-xl text-sm`}
              style={{
                background: statusOk ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.12)",
                border: `1px solid ${statusOk ? "rgba(52,211,153,0.25)" : "rgba(251,191,36,0.25)"}`,
                color: statusOk ? "rgb(110,231,183)" : "rgb(252,211,77)",
              }}>
              <i className={`fa-solid ${statusOk ? "fa-circle-check" : "fa-circle-exclamation"} flex-shrink-0 mt-0.5`} />
              {statusMsg}
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
        <i className="fa-solid fa-lock text-emerald-400" />
        AI-powered receipt verification — StudyBud © 2025
      </p>
    </div>
  );
}
