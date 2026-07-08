import { useState, useEffect } from "react";
import api from "@/lib/api";

interface Lesson {
  _id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];
  order: number;
  completed: boolean;
  locked: boolean;
}

interface Roadmap {
  _id: string;
  title: string;
  subject: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  lessonCount?: number;
  totalMinutes?: number;
  lessons?: Lesson[];
  progress?: {
    completed: number;
    total: number;
    percentage: number;
    startedAt: string | null;
    lastActivityAt: string | null;
  };
}

const DIFFICULTY_COLORS = {
  beginner:     "text-emerald-400 bg-emerald-400/10 border-emerald-400/25",
  intermediate: "text-amber-400 bg-amber-400/10 border-amber-400/25",
  advanced:     "text-red-400 bg-red-400/10 border-red-400/25",
};

const DIFFICULTY_ICONS = {
  beginner:     "fa-seedling",
  intermediate: "fa-chart-line",
  advanced:     "fa-fire",
};

const SUBJECT_ICONS: Record<string, string> = {
  mathematics: "fa-square-root-variable",
  sciences:    "fa-flask",
  physics:     "fa-atom",
  chemistry:   "fa-vial",
  biology:     "fa-dna",
  history:     "fa-landmark",
  geography:   "fa-earth-africa",
  languages:   "fa-language",
  computer:    "fa-laptop-code",
  economics:   "fa-chart-bar",
  default:     "fa-map",
};

function getSubjectIcon(subject: string): string {
  const s = subject.toLowerCase();
  for (const [key, icon] of Object.entries(SUBJECT_ICONS)) {
    if (s.includes(key)) return icon;
  }
  return SUBJECT_ICONS.default;
}

function ProgressRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-muted/40" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="currentColor" strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        className="text-primary transition-all duration-500"
      />
    </svg>
  );
}

export default function Roadmaps() {
  const [roadmaps,      setRoadmaps]      = useState<Roadmap[]>([]);
  const [selected,      setSelected]      = useState<Roadmap | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [expandedLesson,setExpandedLesson]= useState<string | null>(null);
  const [error,         setError]         = useState("");

  useEffect(() => {
    setLoading(true);
    api.get("/roadmaps")
      .then(r => setRoadmaps(r.data.data || []))
      .catch(() => setError("Could not load roadmaps."))
      .finally(() => setLoading(false));
  }, []);

  const openRoadmap = async (id: string) => {
    setDetailLoading(true);
    setError("");
    setExpandedLesson(null);
    try {
      const { data } = await api.get(`/roadmaps/${id}`);
      setSelected(data.data);
    } catch {
      setError("Could not load roadmap.");
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleLesson = async (lessonId: string, completed: boolean) => {
    if (!selected) return;
    setActionLoading(lessonId);
    try {
      if (completed) {
        await api.delete(`/roadmaps/${selected._id}/lessons/${lessonId}/complete`);
      } else {
        await api.post(`/roadmaps/${selected._id}/lessons/${lessonId}/complete`);
      }
      const { data } = await api.get(`/roadmaps/${selected._id}`);
      setSelected(data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not update lesson.");
    } finally {
      setActionLoading(null);
    }
  };

  const subjects = [...new Set(roadmaps.map(r => r.subject))].slice(0, 12);

  const filtered = roadmaps.filter(r =>
    !subjectFilter ||
    r.subject.toLowerCase().includes(subjectFilter.toLowerCase()) ||
    r.title.toLowerCase().includes(subjectFilter.toLowerCase())
  );

  /* ── Detail view ──────────────────────────────────────────────────────── */
  if (selected) {
    const lessons = selected.lessons || [];
    const progress = selected.progress;
    const pct = progress?.percentage ?? 0;

    return (
      <div className="max-w-3xl space-y-6">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelected(null); setError(""); setExpandedLesson(null); }}
            className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex-shrink-0"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold capitalize ${DIFFICULTY_COLORS[selected.difficulty]}`}>
                <i className={`fa-solid ${DIFFICULTY_ICONS[selected.difficulty]} text-[9px]`} />
                {selected.difficulty}
              </span>
              <span className="text-xs text-muted-foreground capitalize">{selected.subject}</span>
            </div>
            <h1 className="text-xl font-bold text-foreground mt-0.5 truncate">{selected.title}</h1>
          </div>
        </div>

        {/* Progress bar */}
        {progress && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            {selected.description && (
              <p className="text-sm text-muted-foreground">{selected.description}</p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.completed} / {progress.total} lessons complete</span>
              <span className="font-bold text-foreground text-sm">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/10 border border-destructive/30 text-destructive">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
          </div>
        )}

        {/* Lesson list */}
        <div className="space-y-2">
          {lessons.map((lesson, idx) => {
            const isLoading  = actionLoading === lesson._id;
            const isExpanded = expandedLesson === lesson._id;

            return (
              <div
                key={lesson._id}
                className={`bg-card border rounded-2xl overflow-hidden transition-all ${
                  lesson.locked
                    ? "border-border opacity-60"
                    : lesson.completed
                    ? "border-emerald-400/30"
                    : "border-border hover:border-primary/30"
                }`}
              >
                {/* Row */}
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 text-left"
                  onClick={() => {
                    if (!lesson.locked) setExpandedLesson(isExpanded ? null : lesson._id);
                  }}
                  disabled={lesson.locked}
                >
                  {/* Status badge */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    lesson.locked    ? "bg-muted" :
                    lesson.completed ? "bg-emerald-400/15" : "bg-primary/10"
                  }`}>
                    <i className={`fa-solid text-sm ${
                      lesson.locked    ? "fa-lock text-muted-foreground" :
                      lesson.completed ? "fa-circle-check text-emerald-400" : "fa-circle-play text-primary"
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">{String(idx + 1).padStart(2, "0")}</span>
                      <p className={`text-sm font-semibold truncate ${
                        lesson.locked ? "text-muted-foreground" :
                        lesson.completed ? "line-through text-muted-foreground" : "text-foreground"
                      }`}>{lesson.title}</p>
                      <span className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${DIFFICULTY_COLORS[lesson.difficulty]}`}>
                        {lesson.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        <i className="fa-regular fa-clock mr-1" />{lesson.estimatedMinutes} min
                      </span>
                      {lesson.prerequisites.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          <i className="fa-solid fa-lock-open mr-1" />{lesson.prerequisites.length} prereq{lesson.prerequisites.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {lesson.locked ? (
                    <span className="flex-shrink-0 text-xs text-muted-foreground px-2">Locked</span>
                  ) : (
                    <i className={`fa-solid fa-chevron-${isExpanded ? "up" : "down"} text-muted-foreground/40 text-xs flex-shrink-0`} />
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
                    {lesson.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{lesson.description}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleLesson(lesson._id, lesson.completed)}
                        disabled={!!actionLoading}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 ${
                          lesson.completed
                            ? "border-muted text-muted-foreground hover:bg-muted"
                            : "border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                        }`}
                      >
                        {isLoading ? (
                          <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                        ) : (
                          <i className={`fa-solid ${lesson.completed ? "fa-rotate-left" : "fa-check"}`} />
                        )}
                        {lesson.completed ? "Mark Incomplete" : "Mark Complete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {lessons.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-list-check text-muted-foreground text-lg" />
              </div>
              <p className="text-sm text-muted-foreground">No lessons yet in this roadmap.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── List view ────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Learning Roadmaps</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Structured learning paths with prerequisites, difficulty levels and progress tracking.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
        </div>
      )}

      {/* Subject filter chips — horizontal scroll */}
      {subjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSubjectFilter("")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              !subjectFilter ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >All</button>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s === subjectFilter ? "" : s)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border capitalize transition-all ${
                subjectFilter === s ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
        <input
          type="text"
          value={subjectFilter}
          onChange={e => setSubjectFilter(e.target.value)}
          placeholder="Search roadmaps…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <i className="fa-solid fa-map text-muted-foreground text-xl" />
          </div>
          <p className="text-sm font-semibold text-foreground">No roadmaps found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {roadmaps.length === 0 ? "Roadmaps will appear here once an admin creates them." : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => {
            const pct = r.progress?.percentage ?? 0;
            return (
              <button
                key={r._id}
                onClick={() => openRoadmap(r._id)}
                className="bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md transition-all group space-y-4"
              >
                {/* Top row: icon + progress ring */}
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${DIFFICULTY_COLORS[r.difficulty]}`}>
                    <i className={`fa-solid ${getSubjectIcon(r.subject)} text-sm`} />
                  </div>
                  <div className="relative flex items-center justify-center">
                    <ProgressRing pct={pct} size={40} />
                    <span className="absolute text-[9px] font-bold text-foreground">{pct}%</span>
                  </div>
                </div>

                {/* Title + description */}
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">{r.title}</p>
                  {r.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.description}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 pt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold capitalize ${DIFFICULTY_COLORS[r.difficulty]}`}>
                    <i className={`fa-solid ${DIFFICULTY_ICONS[r.difficulty]} text-[9px]`} />
                    {r.difficulty}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <i className="fa-solid fa-list-check mr-1" />{r.lessonCount ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <i className="fa-regular fa-clock mr-1" />{r.totalMinutes ?? 0}m
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-8 flex items-center gap-3 shadow-xl">
            <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-foreground font-medium">Loading roadmap…</span>
          </div>
        </div>
      )}
    </div>
  );
}
