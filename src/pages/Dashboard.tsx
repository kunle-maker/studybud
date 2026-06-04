import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import UsageBar from "@/components/UsageBar";

interface UsageData {
  role: string;
  usageStats: {
    summariesToday:          number;
    teacherQuestionsToday:   number;
    topicExplanationsToday:  number;
    ocrToday:                number;
  };
  limits: {
    summaries: number | string;
    teacher:   number | string;
    topic:     number | string;
    ocr:       number | string;
  };
}

interface DashboardData {
  totalCounts:    { summaries: number; chats: number; ocrUploads: number };
  recentActivity: Array<{ type: string; content: string; createdAt: string }>;
}

const featureCards = [
  { icon: "fa-bolt",            label: "Summarize Text",   desc: "Condense any study material",  path: "/summaries",  color: "bg-blue-400/15 text-blue-300 border-blue-400/20" },
  { icon: "fa-chalkboard-user", label: "Ask AI Teacher",   desc: "Multi-turn study chat",         path: "/teacher",    color: "bg-violet-400/15 text-violet-300 border-violet-400/20" },
  { icon: "fa-lightbulb",       label: "Explain Topic",    desc: "Deep explanations",             path: "/topics",     color: "bg-amber-400/15 text-amber-300 border-amber-400/20" },
  { icon: "fa-camera",          label: "OCR Scanner",      desc: "Extract text from images",      path: "/ocr",        color: "bg-emerald-400/15 text-emerald-300 border-emerald-400/20" },
  { icon: "fa-cards-blank",     label: "Flashcards",       desc: "AI-generated study cards",      path: "/flashcards", color: "bg-pink-400/15 text-pink-300 border-pink-400/20" },
  { icon: "fa-circle-question", label: "Quiz Mode",        desc: "Test your knowledge",           path: "/quiz",       color: "bg-orange-400/15 text-orange-300 border-orange-400/20" },
  { icon: "fa-youtube",         label: "Video Search",     desc: "Find YouTube lessons",          path: "/videos",     color: "bg-red-400/15 text-red-300 border-red-400/20" },
];

function limitAsNumber(v: number | string): number {
  return typeof v === "number" ? v : 999;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [usage,     setUsage]     = useState<UsageData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/users/usage").then(r => r.data.data),
      api.get("/users/dashboard").then(r => r.data.data),
    ]).then(([u, d]) => {
      setUsage(u);
      setDashboard(d);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const isPremium = user?.role === "premium";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hello, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isPremium ? "You're on Premium — all features unlocked." : "Free plan · Daily limits reset at midnight UTC"}
          </p>
        </div>
        {!isPremium && (
          <Link href="/premium" data-testid="btn-upgrade"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-amber-300 hover:text-amber-200 transition-colors no-underline"
            style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.28)" }}>
            <i className="fa-solid fa-crown text-amber-400" />Upgrade to Premium
          </Link>
        )}
      </div>

      {/* Stats */}
      {dashboard && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: "fa-bolt",     label: "Summaries", value: dashboard.totalCounts?.summaries  ?? 0, color: "text-blue-300 bg-blue-400/15" },
            { icon: "fa-comments", label: "Chats",     value: dashboard.totalCounts?.chats      ?? 0, color: "text-violet-300 bg-violet-400/15" },
            { icon: "fa-camera",   label: "OCR Scans", value: dashboard.totalCounts?.ocrUploads ?? 0, color: "text-emerald-300 bg-emerald-400/15" },
          ].map((stat) => (
            <div key={stat.label} data-testid={`stat-${stat.label.toLowerCase()}`}
              className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.color}`}>
                <i className={`fa-solid ${stat.icon} text-sm`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label} total</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feature Grid */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-4">What do you want to study?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {featureCards.map((card) => (
            <Link key={card.path} href={card.path}
              data-testid={`card-feature-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
              className="bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col gap-3 no-underline">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.color}`}>
                <i className={`fa-solid ${card.icon} text-sm`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{card.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Usage Meters */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Today's Usage</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Resets at midnight UTC</p>
          </div>
          {isPremium && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 px-2.5 py-1 rounded-full"
              style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)" }}>
              <i className="fa-solid fa-crown" />Premium
            </span>
          )}
        </div>
        {loading ? (
          <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : usage ? (
          <div className="grid sm:grid-cols-2 gap-5">
            <UsageBar label="Summaries"          icon="fa-bolt"            used={usage.usageStats.summariesToday}         limit={limitAsNumber(usage.limits.summaries)} isPremium={isPremium} />
            <UsageBar label="Teacher Questions"  icon="fa-chalkboard-user" used={usage.usageStats.teacherQuestionsToday}  limit={limitAsNumber(usage.limits.teacher)}   isPremium={isPremium} />
            <UsageBar label="Topic Explanations" icon="fa-lightbulb"       used={usage.usageStats.topicExplanationsToday} limit={limitAsNumber(usage.limits.topic)}     isPremium={isPremium} />
            <UsageBar label="OCR Uploads"        icon="fa-camera"          used={usage.usageStats.ocrToday}               limit={limitAsNumber(usage.limits.ocr)}       isPremium={isPremium} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Could not load usage data.</p>
        )}
      </div>

      {/* Recent Activity */}
      {dashboard?.recentActivity && dashboard.recentActivity.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {dashboard.recentActivity.map((item, i) => (
              <div key={i} data-testid={`activity-item-${i}`}
                className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fa-solid fa-bolt text-primary text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.content}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
