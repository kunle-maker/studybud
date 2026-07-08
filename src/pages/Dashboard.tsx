import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

interface UsageStats {
  teacherQuestionsToday: number;
  summariesToday: number;
  ocrUploadsToday: number;
  dailyLimitTeacher: number;
  dailyLimitSummaries: number;
  dailyLimitOcr: number;
}

const FEATURES = [
  { label: "AI Tutor",    desc: "Instant explanations in any style", icon: "fa-robot",           path: "/teacher",     grad: "from-blue-500/15 to-transparent",   border: "border-blue-500/20",   ic: "text-blue-400"   },
  { label: "Summaries",   desc: "Condense any text to key points",   icon: "fa-file-lines",      path: "/summaries",   grad: "from-green-500/15 to-transparent",  border: "border-green-500/20",  ic: "text-green-400"  },
  { label: "Flashcards",  desc: "AI-generated study cards",          icon: "fa-clone",           path: "/flashcards",  grad: "from-yellow-500/15 to-transparent", border: "border-yellow-500/20", ic: "text-yellow-400" },
  { label: "Quiz Mode",   desc: "Test yourself with smart MCQs",     icon: "fa-circle-question", path: "/quiz",        grad: "from-orange-500/15 to-transparent", border: "border-orange-500/20", ic: "text-orange-400" },
  { label: "Roadmaps",    desc: "Structured paths for any subject",  icon: "fa-map",             path: "/roadmaps",    grad: "from-indigo-500/15 to-transparent", border: "border-indigo-500/20", ic: "text-indigo-400" },
  { label: "Assignments", desc: "AI-graded collaborative work",      icon: "fa-clipboard-list",  path: "/assignments", grad: "from-violet-500/15 to-transparent", border: "border-violet-500/20", ic: "text-violet-400" },
  { label: "Subjects",    desc: "Expert tutors per subject area",    icon: "fa-book-open",       path: "/subjects",    grad: "from-teal-500/15 to-transparent",   border: "border-teal-500/20",   ic: "text-teal-400"   },
  { label: "OCR Scanner", desc: "Extract text from images",          icon: "fa-camera",          path: "/ocr",         grad: "from-rose-500/15 to-transparent",   border: "border-rose-500/20",   ic: "text-rose-400"   },
  { label: "Topics",      desc: "Deep-dive explanations on demand",  icon: "fa-magnifying-glass",path: "/topics",      grad: "from-sky-500/15 to-transparent",    border: "border-sky-500/20",    ic: "text-sky-400"    },
  { label: "Videos",      desc: "Curated educational videos",        icon: "fa-play",            path: "/videos",      grad: "from-red-500/15 to-transparent",    border: "border-red-500/20",    ic: "text-red-400"    },
];

const QUICK_PROMPTS = [
  "Explain photosynthesis clearly",
  "Help me understand calculus",
  "What caused World War I?",
  "Teach me Newton's laws",
];

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<UsageStats | null>(null);
  const isPremium = user?.role === "premium";
  const firstName = user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    api.get("/users/usage").then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 pt-1">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{greeting}</p>
          <h1 className="text-2xl font-bold text-foreground mt-0.5">{firstName}</h1>
          <p className="text-sm text-muted-foreground mt-1">What would you like to study today?</p>
        </div>
        {isPremium && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 px-3 py-1.5 rounded-full border flex-shrink-0"
            style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)" }}>
            <i className="fa-solid fa-crown text-[10px]" /> Premium
          </span>
        )}
      </div>

      {/* ── AI Tutor quick start ── */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick start</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => setLocation("/teacher")}
              className="text-xs px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/60 transition-all duration-150">
              {p}
            </button>
          ))}
        </div>
        <button onClick={() => setLocation("/teacher")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/8 hover:bg-primary/12 transition-all duration-150 group">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-robot text-primary text-sm" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-foreground">Open AI Tutor</p>
            <p className="text-xs text-muted-foreground">Full-screen chat · streaming responses · multiple teaching styles</p>
          </div>
          <i className="fa-solid fa-arrow-right text-primary text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* ── Feature grid ── */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Study tools</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {FEATURES.map(f => (
            <button key={f.path} onClick={() => setLocation(f.path)}
              className={`p-4 rounded-2xl border ${f.border} bg-gradient-to-br ${f.grad} hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 text-left`}>
              <div className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center mb-3 shadow-sm">
                <i className={`fa-solid ${f.icon} ${f.ic} text-xs`} />
              </div>
              <p className="text-xs font-semibold text-foreground leading-tight">{f.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Usage stats ── */}
      {stats && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Today's usage</p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: "AI Questions", used: stats.teacherQuestionsToday,  limit: stats.dailyLimitTeacher,   icon: "fa-robot",      ic: "text-blue-400"  },
              { label: "Summaries",    used: stats.summariesToday,          limit: stats.dailyLimitSummaries, icon: "fa-file-lines", ic: "text-green-400" },
              { label: "OCR Scans",    used: stats.ocrUploadsToday,         limit: stats.dailyLimitOcr,       icon: "fa-camera",     ic: "text-rose-400"  },
            ].map(s => {
              const pct = Math.min(100, (s.used / Math.max(1, s.limit)) * 100);
              return (
                <div key={s.label}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <i className={`fa-solid ${s.icon} ${s.ic} text-xs`} />
                    <span className="text-[11px] text-muted-foreground">{s.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-foreground">{s.used}</span>
                    <span className="text-xs text-muted-foreground">/ {s.limit}</span>
                  </div>
                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: pct > 80 ? "rgb(239,68,68)" : "rgb(99,102,241)" }} />
                  </div>
                </div>
              );
            })}
          </div>
          {!isPremium && (
            <button onClick={() => setLocation("/premium")}
              className="mt-5 w-full text-xs font-semibold text-amber-400 py-2 rounded-xl border transition-all hover:opacity-80"
              style={{ background: "rgba(251,191,36,0.06)", borderColor: "rgba(251,191,36,0.2)" }}>
              <i className="fa-solid fa-crown mr-1.5" />Upgrade to Premium for higher limits
            </button>
          )}
        </div>
      )}
    </div>
  );
}
