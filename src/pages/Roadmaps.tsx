import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
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
  hasContent: boolean;
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
  examStatus: string | null;
  canTakeExam: boolean;
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

function RoadmapCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-muted" />
        <div className="w-10 h-10 rounded-full bg-muted" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-lg bg-muted" />
        <div className="h-5 w-10 rounded-lg bg-muted" />
        <div className="h-5 w-12 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-muted rounded w-2/3" />
          <div className="h-3 bg-muted rounded w-1/3" />
        </div>
        <div className="w-4 h-4 rounded bg-muted" />
      </div>
    </div>
  );
}

export default function Roadmaps() {
  const [, setLocation] = useLocation();
  const { roadmapId: urlRoadmapId } = useParams<{ roadmapId?: string }>();

  const [roadmaps,      setRoadmaps]      = useState<Roadmap[]>([]);
  const [selected,      setSelected]      = useState<Roadmap | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [expandedLesson,setExpandedLesson]= useState<string | null>(null);
  const [error,         setError]         = useState("");

  // Delete-mode state
  const [deleteMode,    setDeleteMode]    = useState(false);
  const [deleteSelected,setDeleteSelected]= useState<Set<string>>(new Set());
  const [deleting,      setDeleting]      = useState(false);

  // Generate-with-AI state
  const [showGenerate,  setShowGenerate]  = useState(false);
  const [genTopic,      setGenTopic]      = useState("");
  const [genSubject,    setGenSubject]    = useState("");
  const [genDifficulty, setGenDifficulty] = useState<"beginner"|"intermediate"|"advanced">("beginner");
  const [generating,    setGenerating]    = useState(false);
  const [genError,      setGenError]      = useState("");

  const loadRoadmaps = () => {
    setLoading(true);
    api.get("/roadmaps")
      .then(r => setRoadmaps(r.data.data || []))
      .catch(() => setError("Could not load roadmaps."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRoadmaps(); }, []);

  // If a roadmapId is in the URL (e.g. navigated from an AI action session),
  // auto-open that roadmap once the list has loaded.
  useEffect(() => {
    if (urlRoadmapId && !selected) {
      openRoadmap(urlRoadmapId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRoadmapId]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genTopic.trim() || !genSubject.trim()) return;
    setGenerating(true);
    setGenError("");
    try {
      await api.post("/roadmaps/generate", {
        topic: genTopic.trim(),
        subject: genSubject.trim(),
        difficulty: genDifficulty,
      });
      setShowGenerate(false);
      setGenTopic(""); setGenSubject(""); setGenDifficulty("beginner"); setGenError("");
      loadRoadmaps();
    } catch (err: any) {
      setGenError(err?.response?.data?.message || "Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

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

  const handleDeleteRoadmaps = async () => {
    if (deleteSelected.size === 0 || deleting) return;
    setDeleting(true);
    setError("");
    const ids = [...deleteSelected];
    try {
      await Promise.all(ids.map(id => api.delete(`/roadmaps/${id}`)));
      setRoadmaps(prev => prev.filter(r => !deleteSelected.has(r._id)));
      setDeleteSelected(new Set());
      setDeleteMode(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not delete selected roadmaps.");
    } finally {
      setDeleting(false);
    }
  };

  const toggleDeleteSelect = (id: string) => {
    setDeleteSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const subjects = [...new Set(roadmaps.map(r => r.subject))].slice(0, 12);

  const filtered = roadmaps.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
    const matchesSubject = !subjectFilter || r.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  /* ── Detail view ──────────────────────────────────────────────────────── */
  if (selected) {
    const lessons = selected.lessons || [];
    const progress = selected.progress;
    const pct = progress?.percentage ?? 0;
    const allComplete = selected.canTakeExam;

    return (
      <div className="max-w-3xl space-y-6">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelected(null); setError(""); setExpandedLesson(null); setLocation("/roadmaps"); }}
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

        {/* Progress card */}
        {progress && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            {selected.description && (
              <p className="text-sm text-muted-foreground">{selected.description}</p>
            )}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.completed} / {progress.total} chapters complete</span>
              <span className="font-bold text-foreground text-sm">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Final exam CTA */}
            {allComplete && (
              <div className="pt-1 border-t border-border mt-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-graduation-cap text-amber-400" />
                      All chapters complete!
                    </p>
                    <p className="text-xs text-muted-foreground">Take the final exam to test your mastery.</p>
                  </div>
                  <button
                    onClick={() => setLocation(`/roadmaps/${selected._id}/exam`)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                      selected.examStatus === "graded"
                        ? "bg-emerald-400/15 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/25"
                        : "bg-amber-400 text-black hover:bg-amber-400/90 shadow-amber-400/20"
                    }`}
                  >
                    {selected.examStatus === "graded"
                      ? <><i className="fa-solid fa-trophy text-xs" />View Results</>
                      : selected.examStatus === "in_progress"
                      ? <><i className="fa-solid fa-play text-xs" />Continue Exam</>
                      : <><i className="fa-solid fa-pen-to-square text-xs" />Start Final Exam</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/10 border border-destructive/30 text-destructive">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
            <button onClick={() => setError("")} className="ml-auto"><i className="fa-solid fa-xmark" /></button>
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
                  {/* Status icon */}
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
                      {lesson.hasContent && (
                        <span className="text-[10px] text-primary/70">
                          <i className="fa-solid fa-book-open mr-1" />Content ready
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
                    <div className="flex gap-2 flex-wrap">
                      {/* Open chapter button */}
                      <button
                        onClick={() => setLocation(`/roadmaps/${selected._id}/chapter/${lesson._id}`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
                      >
                        <i className="fa-solid fa-book-open text-[10px]" />
                        {lesson.hasContent ? "Open Chapter" : "Generate & Open Chapter"}
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
              <i className="fa-solid fa-map text-primary text-sm" />
            </span>
            Learning Roadmaps
          </h1>
          <p className="text-muted-foreground text-sm mt-1 ml-0.5">
            AI-generated learning journeys — chapter content, comprehension checks, and a final exam.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {deleteMode ? (
            <>
              <button
                onClick={() => { setDeleteMode(false); setDeleteSelected(new Set()); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <i className="fa-solid fa-xmark text-xs" />Cancel
              </button>
              {deleteSelected.size > 0 && (
                <button
                  onClick={handleDeleteRoadmaps}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all disabled:opacity-60 shadow-sm"
                >
                  {deleting
                    ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</>
                    : <><i className="fa-solid fa-trash text-xs" />Delete {deleteSelected.size}</>}
                </button>
              )}
            </>
          ) : (
            <>
              {roadmaps.length > 0 && (
                <button
                  onClick={() => setDeleteMode(true)}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5 transition-all"
                  title="Delete roadmaps"
                >
                  <i className="fa-solid fa-trash text-xs" />
                </button>
              )}
              <button
                onClick={() => { setShowGenerate(true); setGenError(""); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm shadow-primary/30"
              >
                <i className="fa-solid fa-wand-magic-sparkles" />
                Generate Roadmap
              </button>
            </>
          )}
        </div>
      </div>

      {/* Generate modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <i className="fa-solid fa-wand-magic-sparkles text-primary text-xs" />
                </span>
                <span className="font-semibold text-foreground text-sm">Generate Learning Roadmap</span>
              </div>
              <button
                onClick={() => setShowGenerate(false)}
                disabled={generating}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-40"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              {genError && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-xs bg-destructive/10 border border-destructive/30 text-destructive">
                  <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{genError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topic *</label>
                <input
                  value={genTopic}
                  onChange={e => setGenTopic(e.target.value)}
                  placeholder="e.g. Calculus, Machine Learning, Organic Chemistry"
                  required
                  disabled={generating}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject *</label>
                <input
                  value={genSubject}
                  onChange={e => setGenSubject(e.target.value)}
                  placeholder="e.g. Mathematics, Computer Science, Chemistry"
                  required
                  disabled={generating}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Difficulty</label>
                <div className="flex gap-2">
                  {(["beginner", "intermediate", "advanced"] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setGenDifficulty(d)}
                      disabled={generating}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border capitalize transition-all disabled:opacity-60 ${
                        genDifficulty === d
                          ? d === "beginner"     ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-400"
                          : d === "intermediate" ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
                                                 : "bg-red-400/20 border-red-400/40 text-red-400"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >{d}</button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
                <i className="fa-solid fa-circle-info text-primary/70 mt-0.5 flex-shrink-0" />
                <span>Each chapter includes AI-generated content (~1 hour of study) and comprehension questions. Free plan: 2 roadmaps/day.</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGenerate(false)}
                  disabled={generating}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-60"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={generating || !genTopic.trim() || !genSubject.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {generating
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
                    : <><i className="fa-solid fa-wand-magic-sparkles text-xs" />Generate</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
          <button onClick={() => setError("")} className="ml-auto"><i className="fa-solid fa-xmark" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search roadmaps by title, subject, or description…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Subject filter chips */}
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
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <RoadmapCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <i className="fa-solid fa-map text-muted-foreground text-xl" />
          </div>
          <p className="text-sm font-semibold text-foreground">No roadmaps found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {roadmaps.length === 0
              ? "Generate your first AI-powered learning roadmap."
              : "Try a different search or clear the subject filter."}
          </p>
          {roadmaps.length === 0 && (
            <button
              onClick={() => { setShowGenerate(true); setGenError(""); }}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-xs" />Generate Roadmap
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => {
            const pct       = r.progress?.percentage ?? 0;
            const isChecked = deleteSelected.has(r._id);
            return (
              <button
                key={r._id}
                onClick={() => deleteMode ? toggleDeleteSelect(r._id) : openRoadmap(r._id)}
                className={`bg-card border rounded-2xl p-5 text-left transition-all group space-y-4 ${
                  deleteMode
                    ? isChecked
                      ? "border-destructive/60 bg-destructive/5 ring-1 ring-destructive/30"
                      : "border-border hover:border-destructive/30 hover:bg-destructive/5"
                    : "border-border hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md"
                }`}
              >
                {/* Top row: icon + progress ring OR checkbox */}
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${DIFFICULTY_COLORS[r.difficulty]}`}>
                    <i className={`fa-solid ${getSubjectIcon(r.subject)} text-sm`} />
                  </div>
                  {deleteMode ? (
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isChecked ? "bg-destructive border-destructive" : "border-border"
                    }`}>
                      {isChecked && <i className="fa-solid fa-check text-white text-[9px]" />}
                    </div>
                  ) : (
                    <div className="relative flex items-center justify-center">
                      <ProgressRing pct={pct} size={40} />
                      <span className="absolute text-[9px] font-bold text-foreground">{pct}%</span>
                    </div>
                  )}
                </div>

                {/* Title + description */}
                <div className="space-y-1">
                  <p className={`text-sm font-bold leading-tight transition-colors ${
                    deleteMode
                      ? isChecked ? "text-destructive" : "text-foreground"
                      : "text-foreground group-hover:text-primary"
                  }`}>{r.title}</p>
                  {r.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{r.description}</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold capitalize ${DIFFICULTY_COLORS[r.difficulty]}`}>
                    <i className={`fa-solid ${DIFFICULTY_ICONS[r.difficulty]} text-[9px]`} />
                    {r.difficulty}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <i className="fa-solid fa-list-check mr-1" />{r.lessonCount ?? 0} chapters
                  </span>
                  {!deleteMode && (
                    <span className="text-xs text-muted-foreground">
                      <i className="fa-regular fa-clock mr-1" />{r.totalMinutes ?? 0}m
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-8 space-y-4 shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-foreground font-medium">Loading roadmap…</span>
            </div>
            <div className="space-y-2">
              {[1,2,3].map(i => <LessonSkeleton key={i} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
