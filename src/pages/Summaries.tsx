import { useState, useEffect } from "react";
import api from "@/lib/api";
import LimitBanner from "@/components/LimitBanner";

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
  const [text, setText] = useState("");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get("/summaries/history").then(r => setHistory(r.data.data?.items ?? r.data.data ?? [])).catch(() => {}).finally(() => setLoadingHistory(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLimitReached(false); setResult(null);
    if (text.trim().length < 10) { setError("Please enter at least 10 characters."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/summaries", { text });
      setResult(data.data);
      setHistory(prev => [{ _id: data.data.id, summary: data.data.summary, originalLength: data.data.originalLength, createdAt: new Date().toISOString() }, ...prev]);
    } catch (err: any) {
      if (err?.response?.data?.limitReached) { setLimitReached(true); }
      else { setError(err?.response?.data?.message || "Failed to generate summary. Please try again."); }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.summary).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Summaries</h1>
        <p className="text-muted-foreground text-sm mt-1">Paste study material and get a concise AI summary instantly.</p>
      </div>

      {limitReached && <LimitBanner feature="summaries" />}

      <div className="bg-card border border-border rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Study Material
              <span className="ml-2 font-normal normal-case text-muted-foreground/70">{text.length}/5000 characters</span>
            </label>
            <textarea
              data-testid="input-text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 5000))}
              rows={8}
              placeholder="Paste your study notes, textbook passages, or any text you want to summarize…"
              className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <i className="fa-solid fa-circle-exclamation" />{error}
            </div>
          )}
          <button
            data-testid="btn-summarize"
            type="submit"
            disabled={loading || text.trim().length < 10}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            style={{ background: "hsl(217 91% 48%)" }}
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Summarizing…</>
            ) : (
              <><i className="fa-solid fa-bolt" />Generate Summary</>
            )}
          </button>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div data-testid="summary-result" className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <i className="fa-solid fa-bolt text-primary text-xs" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">Summary</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{result.originalLength} → {result.summaryLength} chars</span>
              <button
                data-testid="btn-copy"
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  copied ? "border-emerald-400/40 text-emerald-300" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <i className={`fa-${copied ? "solid fa-check" : "regular fa-copy"}`} />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.summary}</p>
        </div>
      )}

      {/* History */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Summary History</h2>
        {loadingHistory ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <i className="fa-solid fa-bolt text-3xl mb-3 opacity-30 block" />
            <p className="text-sm">No summaries yet. Generate your first one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, i) => (
              <div key={item._id || i} data-testid={`history-item-${i}`} className="flex gap-3 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fa-solid fa-bolt text-primary text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{item.summary}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleDateString()} · {item.originalLength} chars original</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
