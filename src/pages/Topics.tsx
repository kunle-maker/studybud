import { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LimitBanner from "@/components/LimitBanner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AIActionCards from "@/components/AIActionCards";

type Level = "beginner" | "intermediate" | "advanced";

interface LocalHistory {
  id: string;
  topic: string;
  level: Level;
  explanation: string;
  ts: number;
}

export default function Topics() {
  const { user } = useAuth();

  const [topic,        setTopic]        = useState("");
  const [level,        setLevel]        = useState<Level>("beginner");
  const [explanation,  setExplanation]  = useState("");
  const [loading,      setLoading]      = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error,        setError]        = useState("");
  const [copied,       setCopied]       = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");
  const [localHistory, setLocalHistory] = useState<LocalHistory[]>([]);

  const LEVELS: { value: Level; label: string; icon: string; color: string }[] = [
    { value: "beginner",     label: "Beginner",     icon: "fa-seedling",   color: "text-emerald-400" },
    { value: "intermediate", label: "Intermediate", icon: "fa-chart-line", color: "text-amber-400"   },
    { value: "advanced",     label: "Advanced",     icon: "fa-fire",       color: "text-red-400"     },
  ];

  const SUGGESTIONS = [
    "Quantum entanglement",
    "CRISPR gene editing",
    "The French Revolution",
    "Machine learning basics",
    "The Krebs cycle",
    "Black holes",
  ];

  const handleExplain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setError(""); setLimitReached(false); setExplanation(""); setCopied(false);
    setLoading(true);
    try {
      const { data } = await api.post("/topics/explain", { topic, level, context: [] });
      const result = data.data.explanation;
      setExplanation(result);
      setCurrentTopic(topic);
      setLocalHistory(prev => [
        { id: Date.now().toString(), topic, level, explanation: result, ts: Date.now() },
        ...prev.slice(0, 9),
      ]);
    } catch (err: any) {
      if (err?.response?.data?.limitReached) setLimitReached(true);
      else setError(err?.response?.data?.message || "Failed to explain topic.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setTopic(""); setExplanation(""); setError(""); setLimitReached(false); setCopied(false);
  };

  const copyResult = () => {
    navigator.clipboard.writeText(explanation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const timeAgo = (ts: number) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="max-w-3xl space-y-8">
      {/* Hero */}
      <div className="text-center pt-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center mx-auto mb-4">
          <i className="fa-solid fa-lightbulb text-amber-400 text-base" />
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Explore Any Topic</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
          Get a clear, structured explanation of any concept — tailored to your level.
        </p>
      </div>

      {limitReached && <LimitBanner feature="topic explanations" />}

      {/* Input card */}
      {!explanation && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <form onSubmit={handleExplain} className="space-y-5">
            {/* Topic input */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Topic
              </label>
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none" />
                <input
                  data-testid="input-topic"
                  type="text"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Quantum entanglement, The Krebs cycle…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Suggestions */}
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTopic(s)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Level selector */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LEVELS.map(l => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLevel(l.value)}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      level === l.value
                        ? "bg-primary text-white border-primary"
                        : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                    }`}
                  >
                    <i className={`fa-solid ${l.icon} ${level === l.value ? "text-white" : l.color} text-xs`} />
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <i className="fa-solid fa-circle-exclamation" />{error}
              </p>
            )}

            <button
              data-testid="btn-explain"
              type="submit"
              disabled={loading || !topic.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Explaining…</>
              ) : (
                <><i className="fa-solid fa-wand-magic-sparkles" />Explain This Topic</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Explanation result */}
      {explanation && (
        <div data-testid="explanation-result" className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Result header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-lightbulb text-amber-400 text-xs" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{currentTopic}</p>
                <p className="text-xs text-muted-foreground capitalize">{level} level</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={copyResult}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  copied
                    ? "border-emerald-400/40 text-emerald-400"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <i className={`fa-${copied ? "solid fa-check" : "regular fa-copy"}`} />
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <i className="fa-solid fa-rotate-left" />
                New topic
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <MarkdownRenderer content={explanation} className="text-foreground" />
          </div>

          {/* Action cards */}
          <div className="px-6 pb-5">
            <p className="text-xs text-muted-foreground font-medium mb-2">Continue studying:</p>
            <AIActionCards userMessage={`explain ${currentTopic}`} />
          </div>
        </div>
      )}

      {/* History */}
      {localHistory.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Recent Explanations</h2>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {localHistory.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setTopic(item.topic);
                  setLevel(item.level);
                  setExplanation(item.explanation);
                  setCurrentTopic(item.topic);
                  setCopied(false);
                }}
                className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fa-solid fa-lightbulb text-amber-400 text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.topic}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.explanation.slice(0, 80).replace(/[#*_`]/g, "")}…
                  </p>
                  <p className="text-xs text-muted-foreground/50 mt-1 capitalize">{item.level} · {timeAgo(item.ts)}</p>
                </div>
                <i className="fa-solid fa-chevron-right text-muted-foreground/30 text-xs mt-1 group-hover:text-muted-foreground transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
