import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LimitBanner from "@/components/LimitBanner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AIActionCards from "@/components/AIActionCards";

interface SummaryResult {
  id: string;
  summary: string;
  originalLength: number;
  summaryLength: number;
}

interface HistoryItem {
  _id: string;
  summary: string;
  originalLength: number;
  createdAt: string;
}

export default function Summaries() {
  const { user } = useAuth();
  const isPremium = user?.role === "premium";

  const [text,           setText]           = useState("");
  const [result,         setResult]         = useState<SummaryResult | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [limitReached,   setLimitReached]   = useState(false);
  const [history,        setHistory]        = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copied,         setCopied]         = useState(false);

  useEffect(() => {
    api.get("/summaries/history")
      .then(r => setHistory(r.data.data?.items ?? r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLimitReached(false); setResult(null); setCopied(false);
    if (text.trim().length < 10) { setError("Please enter at least 10 characters."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/summaries", { text });
      setResult(data.data);
      setHistory(prev => [{
        _id: data.data.id,
        summary: data.data.summary,
        originalLength: data.data.originalLength,
        createdAt: new Date().toISOString(),
      }, ...prev.slice(0, 9)]);
    } catch (err: any) {
      if (err?.response?.data?.limitReached) setLimitReached(true);
      else setError(err?.response?.data?.message || "Failed to generate summary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const compressionPct = result
    ? Math.round((1 - result.summaryLength / result.originalLength) * 100)
    : 0;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Summaries</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Paste study material and get a concise, structured summary instantly.
          </p>
        </div>
        {result && (
          <button
            onClick={() => { setResult(null); setText(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <i className="fa-solid fa-plus text-xs" />
            New Summary
          </button>
        )}
      </div>

      {limitReached && <LimitBanner feature="summaries" />}

      {/* Input card */}
      {!result && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                <span>Study Material</span>
                <span className="font-normal normal-case text-muted-foreground/60">{text.length} / 5000</span>
              </label>
              <textarea
                data-testid="input-text"
                value={text}
                onChange={e => setText(e.target.value.slice(0, 5000))}
                rows={9}
                placeholder="Paste your notes, textbook passages, lecture slides, or any text you want to summarise…"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
              />
            </div>

            {/* Hint chips */}
            <div className="flex flex-wrap gap-2">
              {["Chapter notes", "Lecture transcript", "Research paper", "Textbook excerpt"].map(label => (
                <span key={label} className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                  {label}
                </span>
              ))}
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <i className="fa-solid fa-circle-exclamation" />{error}
              </p>
            )}

            <button
              data-testid="btn-summarize"
              type="submit"
              disabled={loading || text.trim().length < 10}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Summarising…</>
              ) : (
                <><i className="fa-solid fa-bolt" />Generate Summary</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Result */}
      {result && (
        <div data-testid="summary-result" className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Result header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-bolt text-primary text-xs" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Summary ready</p>
                <p className="text-xs text-muted-foreground">
                  {result.originalLength} → {result.summaryLength} chars
                  <span className="ml-2 text-emerald-400 font-semibold">{compressionPct}% shorter</span>
                </p>
              </div>
            </div>
            <button
              data-testid="btn-copy"
              onClick={copyToClipboard}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                copied
                  ? "border-emerald-400/40 text-emerald-400"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <i className={`fa-${copied ? "solid fa-check" : "regular fa-copy"}`} />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <MarkdownRenderer content={result.summary} className="text-foreground" />
          </div>

          {/* Continue studying */}
          <div className="px-6 pb-6">
            <p className="text-xs font-medium text-muted-foreground mb-2">Continue studying:</p>
            <AIActionCards userMessage="summarise study material" />
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Summary History</h2>
          {history.length > 0 && (
            <span className="text-xs text-muted-foreground">{history.length} saved</span>
          )}
        </div>

        {loadingHistory ? (
          <div className="divide-y divide-border">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 px-6 py-4 items-start">
                <div className="w-8 h-8 rounded-xl bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <i className="fa-solid fa-bolt text-muted-foreground text-lg" />
            </div>
            <p className="text-sm font-semibold text-foreground">No summaries yet</p>
            <p className="text-xs text-muted-foreground mt-1">Generate your first summary above.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {history.map((item, i) => (
              <button
                key={item._id || i}
                data-testid={`history-item-${i}`}
                onClick={() => {
                  setResult({
                    id: item._id,
                    summary: item.summary,
                    originalLength: item.originalLength,
                    summaryLength: item.summary.length,
                  });
                  setText("");
                }}
                className="w-full flex items-start gap-3 px-6 py-4 text-left hover:bg-muted/30 transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fa-solid fa-bolt text-primary text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                    {item.summary.replace(/[#*_`]/g, "").slice(0, 120)}…
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    {" · "}{item.originalLength} chars original
                  </p>
                </div>
                <i className="fa-solid fa-chevron-right text-muted-foreground/30 text-xs mt-1 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {!isPremium && (
        <p className="text-xs text-muted-foreground text-center">
          <i className="fa-solid fa-lock mr-1" />
          Free plan · limited summaries ·{" "}
          <a href="/premium" className="text-primary hover:underline">Upgrade for unlimited</a>
        </p>
      )}
    </div>
  );
}
