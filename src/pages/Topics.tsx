import { useState } from "react";
import api from "@/lib/api";
import LimitBanner from "@/components/LimitBanner";
import MarkdownRenderer from "@/components/MarkdownRenderer";

export default function Topics() {
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState("");
  const [betterExplanation, setBetterExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingBetter, setLoadingBetter] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error, setError] = useState("");

  const handleExplain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setError(""); setLimitReached(false); setExplanation(""); setBetterExplanation(""); setChatId(null);
    setLoading(true);
    try {
      const { data } = await api.post("/topics/explain", { topic });
      setChatId(data.data.chatId);
      setExplanation(data.data.explanation);
    } catch (err: any) {
      if (err?.response?.data?.limitReached) setLimitReached(true);
      else setError(err?.response?.data?.message || "Failed to explain topic.");
    } finally {
      setLoading(false);
    }
  };

  const handleBetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId) return;
    setError(""); setBetterExplanation("");
    setLoadingBetter(true);
    try {
      const { data } = await api.post("/topics/better", { chatId, question: question || "Explain it more simply" });
      setBetterExplanation(data.data.betterExplanation);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to get better explanation.");
    } finally {
      setLoadingBetter(false);
    }
  };

  const reset = () => { setTopic(""); setQuestion(""); setChatId(null); setExplanation(""); setBetterExplanation(""); setError(""); setLimitReached(false); };

  const suggestions = ["Quantum entanglement", "CRISPR gene editing", "The French Revolution", "Machine learning basics", "The Krebs cycle"];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Topic Explainer</h1>
          <p className="text-muted-foreground text-sm mt-1">Get a deep, clear explanation of any topic — then ask for an even simpler version.</p>
        </div>
        {chatId && <button onClick={reset} data-testid="btn-reset" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><i className="fa-solid fa-rotate-left" />New topic</button>}
      </div>

      {limitReached && <LimitBanner feature="topic explanations" />}

      {/* Input form */}
      {!chatId && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <form onSubmit={handleExplain} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Topic to explain</label>
              <div className="relative">
                <i className="fa-solid fa-lightbulb absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none" />
                <input
                  data-testid="input-topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Quantum entanglement, The Krebs cycle, Keynesian economics…"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map(s => (
                <button key={s} type="button" onClick={() => setTopic(s)}
                  className="px-3 py-1 rounded-xl text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/70 border border-accent-foreground/10 transition-colors">
                  {s}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-destructive flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation" />{error}</p>}
            <button
              data-testid="btn-explain"
              type="submit"
              disabled={loading || !topic.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm"
              style={{ background: "hsl(217 91% 48%)" }}
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Explaining…</>
              ) : (
                <><i className="fa-solid fa-lightbulb" />Explain This Topic</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Explanation result */}
      {explanation && (
        <div data-testid="explanation-result" className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(251,191,36,0.18)" }}>
              <i className="fa-solid fa-lightbulb text-amber-400 text-xs" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{topic}</h2>
          </div>
          <MarkdownRenderer content={explanation} className="text-foreground" />

          {/* Ask for simpler */}
          {!betterExplanation && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3 font-medium">Still confused? Ask for a simpler version:</p>
              <form onSubmit={handleBetter} className="flex gap-3">
                <input
                  data-testid="input-better-question"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Explain it like I'm 10, use an analogy…"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <button
                  data-testid="btn-better"
                  type="submit"
                  disabled={loadingBetter}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex-shrink-0"
                  style={{ background: "hsl(217 91% 48%)" }}
                >
                  {loadingBetter ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <i className="fa-solid fa-wand-magic-sparkles" />}
                  <span className="hidden sm:inline">Simplify</span>
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Better explanation */}
      {betterExplanation && (
        <div data-testid="better-explanation-result" className="bg-card border border-border rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <i className="fa-solid fa-wand-magic-sparkles text-primary text-xs" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Simpler Explanation</h2>
          </div>
          <MarkdownRenderer content={betterExplanation} className="text-foreground" />
        </div>
      )}

      {error && !limitReached && (
        <p className="text-sm text-destructive flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation" />{error}</p>
      )}
    </div>
  );
}
