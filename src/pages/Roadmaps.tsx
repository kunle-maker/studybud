import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

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
  beginner:     "text-emerald-400 bg-emerald-400/15 border-emerald-400/25",
  intermediate: "text-amber-400 bg-amber-400/15 border-amber-400/25",
  advanced:     "text-red-400 bg-red-400/15 border-red-400/25",
};

const DIFFICULTY_ICONS = {
  beginner:     "fa-seedling",
  intermediate: "fa-chart-line",
  advanced:     "fa-fire",
};

export default function Roadmaps() {
  const { user } = useAuth();
  const [roadmaps,       setRoadmaps]       = useState<Roadmap[]>([]);
  const [selected,       setSelected]       = useState<Roadmap | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [detailLoading,  setDetailLoading]  = useState(false);
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);
  const [subjectFilter,  setSubjectFilter]  = useState("");
  const [error,          setError]          = useState("");

  // Load list
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
      // Refresh detail
      const { data } = await api.get(`/roadmaps/${selected._id}`);
      setSelected(data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not update lesson.");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = roadmaps.filter(r =>
    !subjectFilter || r.subject.includes(subjectFilter.toLowerCase()) || r.title.toLowerCase().includes(subjectFilter.toLowerCase())
  );

  const subjects = [...new Set(roadmaps.map(r => r.subject))].slice(0, 12);

  if (selected) {
    const lessons = selected.lessons || [];
    const progress = selected.progress;
    return (
      <div className="max-w-3xl space-y-6">
        {/* Back */}
        <button
          onClick={() => { setSelected(null); setError(""); }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <i className="fa-solid fa-arrow-left" />
          All roadmaps
        </button>

        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border ${DIFFICULTY_COLORS[selected.difficulty]}`}>
                  <i className={`fa-solid ${DIFFICULTY_ICONS[selected.difficulty]} text-[10px]`} />
                  {selected.difficulty}
                </span>
                <span className="text-xs text-muted-foreground capitalize">{selected.subject}</span>
              </div>
              <h1 className="text-xl font-bold text-foreground">{selected.title}</h1>
              {selected.description && (
                <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progress.completed} / {progress.total} lessons complete</span>
                <span className="font-semibold text-foreground">{progress.percentage}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/15 border border-destructive/30 text-destructive">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Lesson list */}
        <div className="space-y-2">
          {lessons.map((lesson, idx) => {
            const isLoading = actionLoading === lesson._id;
            return (
              <div
                key={lesson._id}
                className={`bg-card border rounded-2xl p-4 transition-all ${
                  lesson.locked
                    ? "border-border opacity-60"
                    : lesson.completed
                    ? "border-emerald-400/30 bg-emerald-400/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    lesson.locked ? "bg-muted" :
                    lesson.completed ? "bg-emerald-400/20" : "bg-primary/15"
                  }`}>
                    <i className={`fa-solid ${
                      lesson.locked ? "fa-lock" :
                      lesson.completed ? "fa-circle-check" : "fa-circle"
                    } text-sm ${
                      lesson.locked ? "text-muted-foreground" :
                      lesson.completed ? "text-emerald-400" : "text-primary"
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono">{String(idx + 1).padStart(2, "0")}</span>
                      <p className={`text-sm font-semibold ${lesson.locked ? "text-muted-foreground" : "text-foreground"}`}>
                        {lesson.title}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${DIFFICULTY_COLORS[lesson.difficulty]}`}>
                        {lesson.difficulty}
                      </span>
                    </div>
                    {lesson.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{lesson.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        <i className="fa-regular fa-clock mr-1" />{lesson.estimatedMinutes} min
                      </span>
                      {lesson.prerequisites.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          <i className="fa-solid fa-arrow-right-to-bracket mr-1" />{lesson.prerequisites.length} prereq{lesson.prerequisites.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  {!lesson.locked && (
                    <button
                      onClick={() => toggleLesson(lesson._id, lesson.completed)}
                      disabled={!!actionLoading}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 ${
                        lesson.completed
                          ? "border-emerald-400/30 text-emerald-400 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                          : "border-primary/30 text-primary hover:bg-primary/15"
                      }`}
                    >
                      {isLoading ? (
                        <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                      ) : (
                        <i className={`fa-solid ${lesson.completed ? "fa-rotate-left" : "fa-check"}`} />
                      )}
                      {lesson.completed ? "Undo" : "Complete"}
                    </button>
                  )}
                  {lesson.locked && (
                    <span className="flex-shrink-0 text-xs text-muted-foreground px-3 py-1.5">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
          {lessons.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <i className="fa-solid fa-list-check text-muted-foreground text-3xl mb-3" />
              <p className="text-sm text-muted-foreground">No lessons yet in this roadmap.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <i className="fa-solid fa-map text-primary" />
          Topic Roadmaps
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Structured learning paths with prerequisites, difficulty levels, and progress tracking.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/15 border border-destructive/30 text-destructive">
          <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
        </div>
      )}

      {/* Subject filter chips */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubjectFilter("")}
            className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all ${
              !subjectFilter ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >All</button>
          {subjects.map(s => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s === subjectFilter ? "" : s)}
              className={`px-3 py-1 rounded-xl text-xs font-medium border capitalize transition-all ${
                subjectFilter === s ? "bg-primary text-white border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none" />
        <input
          type="text"
          value={subjectFilter}
          onChange={e => setSubjectFilter(e.target.value)}
          placeholder="Search roadmaps…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
      </div>

      {/* Roadmap grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-44 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-14 text-center">
          <i className="fa-solid fa-map text-muted-foreground text-3xl mb-3" />
          <p className="text-sm font-medium text-foreground">No roadmaps found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {roadmaps.length === 0 ? "Roadmaps will appear here once an admin creates them." : "Try a different search."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(r => (
            <button
              key={r._id}
              onClick={() => openRoadmap(r._id)}
              className="bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md transition-all group space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${DIFFICULTY_COLORS[r.difficulty]}`}>
                  <i className={`fa-solid ${DIFFICULTY_ICONS[r.difficulty]} text-sm`} />
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border capitalize ${DIFFICULTY_COLORS[r.difficulty]}`}>
                  {r.difficulty}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-tight">{r.title}</p>
                {r.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span><i className="fa-solid fa-list-check mr-1" />{r.lessonCount ?? 0} lessons</span>
                <span><i className="fa-regular fa-clock mr-1" />{r.totalMinutes ?? 0} min</span>
                <span className="capitalize ml-auto opacity-70">{r.subject}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-card border border-border rounded-2xl p-8 flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-foreground">Loading roadmap…</span>
          </div>
        </div>
      )}
    </div>
  );
}
