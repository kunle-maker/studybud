import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

const BACKEND = "https://studybud-backend.onrender.com";

const features = [
  { icon: "fa-bolt",            label: "Unlimited Summaries" },
  { icon: "fa-chalkboard-user", label: "Unlimited TeachBuddy" },
  { icon: "fa-lightbulb",       label: "Unlimited Topic Explainer" },
  { icon: "fa-cards-blank",     label: "Unlimited Flashcards" },
  { icon: "fa-circle-question", label: "Unlimited Quizzes" },
  { icon: "fa-camera",          label: "Unlimited OCR Scans" },
  { icon: "fa-palette",         label: "All Teaching Styles" },
  { icon: "fa-clipboard-list",  label: "AI Assignments" },
  { icon: "fa-magnifying-glass",label: "Past Questions Search" },
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
  const [checking,      setChecking]      = useState(false);
  const [statusMsg,     setStatusMsg]     = useState("");
  const [statusOk,      setStatusOk]      = useState(false);
  const [subData,       setSubData]       = useState<SubStatus | null>(null);
  const [uploadStep,    setUploadStep]    = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [uploadMsg,     setUploadMsg]     = useState("");
  const [uploadOk,      setUploadOk]      = useState(false);
  const [uploadDetails, setUploadDetails] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      if (data.data.role === "premium") {
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

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadMsg(""); setUploadOk(false); setUploadDetails(null);
    try {
      const form = new FormData();
      form.append("receipt", file);
      const { data } = await api.post("/subscriptions/submit-receipt", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploadOk(true);
      setUploadDetails(data.data);
      setUploadMsg(data.message || "Payment verified! Your account has been upgraded to Premium 🎉");
      await refreshUser();
    } catch (err: any) {
      setUploadOk(false);
      const d = err?.response?.data;
      if (d?.reason) {
        setUploadMsg(d.reason);
        if (d.detected) {
          setUploadDetails(d);
        }
      } else {
        setUploadMsg(d?.message || "Receipt verification failed. Please try again.");
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Upgrade to Premium</h1>
        <p className="text-muted-foreground text-sm mt-1">Unlock unlimited AI study tools for ₦1,000 / 30 days.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-md">
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
                <i className="fa-solid fa-check text-emerald-400 text-xs" />
                <span className="text-xs text-foreground">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-b border-border space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">How to upgrade</p>
          {[
            { icon: "fa-arrow-up-right-from-square", text: <>Click <strong>Upgrade Now</strong> — you'll be taken to our secure payment page</> },
            { icon: "fa-paper-plane",               text: <>Transfer <strong>exactly ₦1,000</strong> to the SmartCash MFB account shown</> },
            { icon: "fa-camera",                    text: <>Upload a screenshot of your receipt below — AI verifies it instantly</> },
            { icon: "fa-rotate",                    text: <>Your account upgrades automatically once your receipt is verified</> },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <i className={`fa-solid ${step.icon} text-primary text-sm`} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pt-1.5">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="p-6 space-y-3">
          <button
            onClick={handleUpgrade}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 shadow-sm transition-all hover:opacity-90"
            style={{ background: "hsl(217 91% 48%)" }}
          >
            <i className="fa-solid fa-arrow-up-right-from-square" />Upgrade Now — ₦1,000
          </button>

          {!uploadStep ? (
            <button
              onClick={() => setUploadStep(true)}
              className="w-full py-3 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-2 transition-colors"
            >
              <i className="fa-solid fa-camera" />I've Paid — Upload Receipt
            </button>
          ) : (
            <div className="space-y-3 border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-foreground">Upload your payment receipt screenshot</p>
              <p className="text-xs text-muted-foreground">
                Must show: <strong>Ayodele Ganiyu</strong> · <strong>SmartCash</strong> · <strong>₦1,000</strong> · <strong>today's date</strong>
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleReceiptUpload}
                disabled={uploading}
                className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:opacity-90 file:cursor-pointer disabled:opacity-50"
              />
              {uploading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Verifying your receipt with AI…
                </div>
              )}
              {uploadMsg && (
                <div className={`flex items-start gap-2.5 p-3 rounded-xl text-xs`}
                  style={{
                    background: uploadOk ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.1)",
                    border: `1px solid ${uploadOk ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.2)"}`,
                    color: uploadOk ? "rgb(110,231,183)" : "rgb(252,165,165)",
                  }}>
                  <i className={`fa-solid ${uploadOk ? "fa-circle-check" : "fa-circle-exclamation"} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p>{uploadMsg}</p>
                    {!uploadOk && uploadDetails?.detected && (
                      <p className="mt-1 opacity-75">
                        Detected: {uploadDetails.detected.name || "?"} · {uploadDetails.detected.bank || "?"} · {uploadDetails.detected.amount || "?"}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={() => { setUploadStep(false); setUploadMsg(""); setUploadDetails(null); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          <button
            onClick={checkStatus}
            disabled={checking}
            className="w-full py-3 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {checking
              ? <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />Checking…</>
              : <><i className="fa-solid fa-rotate" />Check Upgrade Status</>}
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
