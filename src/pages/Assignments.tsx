import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trophy, PartyPopper, ThumbsUp, BookOpen, Dumbbell, ListChecks, PenSquare, Users2 } from "lucide-react";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Collaborator {
  user: { _id: string; name: string; profilePicture?: string; email?: string };
  role: "editor" | "viewer";
  joinedAt: string;
}

interface Question {
  _id: string;
  type: "multiple_choice" | "short_answer" | "theory" | "problem_solving";
  question: string;
  options?: string[];
  marks: number;
  hint?: string;
  order: number;
}

interface ActivityItem {
  _id?: string;
  actor: { _id?: string; name: string; profilePicture?: string };
  action: string;
  detail: string;
  createdAt: string;
}

interface GradeItem {
  questionId: string;
  score: number;
  maxScore: number;
  status: "correct" | "partial" | "incorrect";
  feedback: string;
  correction?: string;
}

interface GradeResult {
  grades: GradeItem[];
  totalScore: number;
  maxScore: number;
  graded: boolean;
}

interface Assignment {
  _id: string;
  title: string;
  description?: string;
  creator: { _id: string; name: string; profilePicture?: string; email?: string };
  collaborators: Collaborator[];
  questions: Question[];
  aiGenerated: boolean;
  shareToken?: string;
  shareEnabled: boolean;
  status: "open" | "in_progress" | "completed";
  dueDate?: string;
  activity?: ActivityItem[];
  updatedAt: string;
  createdAt: string;
}

interface AssignmentSummary {
  _id: string;
  title: string;
  description?: string;
  creator: { _id: string; name: string };
  collaborators: Collaborator[];
  questions?: Question[];
  aiGenerated?: boolean;
  status: "open" | "in_progress" | "completed";
  dueDate?: string;
  updatedAt: string;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  open:        "text-blue-400 bg-blue-400/15 border-blue-400/25",
  in_progress: "text-amber-400 bg-amber-400/15 border-amber-400/25",
  completed:   "text-emerald-400 bg-emerald-400/15 border-emerald-400/25",
};
const STATUS_LABELS = { open: "Open", in_progress: "In Progress", completed: "Completed" };
const STATUS_ICONS  = { open: "fa-circle", in_progress: "fa-spinner", completed: "fa-circle-check" };

const QUESTION_TYPE_META: Record<Question["type"], { label: string; icon: string; color: string }> = {
  multiple_choice:  { label: "Multiple Choice",  icon: "fa-list-check",      color: "text-violet-400 bg-violet-400/15 border-violet-400/25" },
  short_answer:     { label: "Short Answer",      icon: "fa-pen-line",        color: "text-sky-400 bg-sky-400/15 border-sky-400/25" },
  theory:           { label: "Theory",            icon: "fa-book-open",       color: "text-amber-400 bg-amber-400/15 border-amber-400/25" },
  problem_solving:  { label: "Problem Solving",   icon: "fa-calculator",      color: "text-emerald-400 bg-emerald-400/15 border-emerald-400/25" },
};

const GRADE_STATUS_COLORS: Record<GradeItem["status"], string> = {
  correct:   "text-emerald-400 bg-emerald-400/15 border-emerald-400/25",
  partial:   "text-amber-400  bg-amber-400/15  border-amber-400/25",
  incorrect: "text-red-400    bg-red-400/15    border-red-400/25",
};

const GRADE_DOT: Record<GradeItem["status"], string> = {
  correct:   "bg-emerald-400",
  partial:   "bg-amber-400",
  incorrect: "bg-red-400",
};

function ScoreIcon({ pct, className = "w-5 h-5" }: { pct: number; className?: string }) {
  if (pct >= 90) return <Trophy className={className} />;
  if (pct >= 75) return <PartyPopper className={className} />;
  if (pct >= 50) return <ThumbsUp className={className} />;
  if (pct >= 30) return <BookOpen className={className} />;
  return <Dumbbell className={className} />;
}

const ACTION_ICONS: Record<string, string> = {
  created:           "fa-plus",
  updated:           "fa-pen",
  commented:         "fa-comment",
  invited:           "fa-user-plus",
  joined:            "fa-door-open",
  completed:         "fa-circle-check",
  answered:          "fa-pen-to-square",
  submitted:         "fa-paper-plane",
  graded:            "fa-star",
};

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
type Difficulty = typeof DIFFICULTIES[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Avatar({ user, size = "sm" }: { user?: { name?: string; profilePicture?: string }; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-10 h-10 text-sm" : size === "md" ? "w-8 h-8 text-xs" : "w-7 h-7 text-xs";
  return (
    <div className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-primary/20`}>
      {user?.profilePicture
        ? <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
        : <span className="font-semibold text-primary">{user?.name?.[0]?.toUpperCase() || "?"}</span>}
    </div>
  );
}

function Spinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-5 h-5 border-2" : "w-3.5 h-3.5 border-2";
  return <span className={`${cls} border-white/30 border-t-white rounded-full animate-spin inline-block`} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Assignments() {
  const { user } = useAuth();
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();

  // View state
  const [view, setView] = useState<"list" | "workspace">("list");
  const [deepLinked, setDeepLinked] = useState(false);

  // List state
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  // New assignment dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTitle, setCreateTitle]         = useState("");
  const [createDesc, setCreateDesc]           = useState("");
  const [createDifficulty, setCreateDifficulty] = useState<Difficulty>("Medium");
  const [createEduLevel, setCreateEduLevel]   = useState("Secondary");
  const [createNumQ, setCreateNumQ]           = useState(5);
  const [creating, setCreating]               = useState(false);
  const [generatingQ, setGeneratingQ]         = useState(false);
  const [createError, setCreateError]         = useState("");

  // Workspace state
  const [workspace, setWorkspace]   = useState<Assignment | null>(null);
  const [currentQ, setCurrentQ]     = useState(0);
  const [answers, setAnswers]       = useState<Record<string, string>>({});
  const [savedQIds, setSavedQIds]   = useState<Set<string>>(new Set());
  const [showHint, setShowHint]     = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [grades, setGrades]         = useState<GradeResult | null>(null);
  const [wsError, setWsError]       = useState("");
  const [activity, setActivity]     = useState<ActivityItem[]>([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [rightOpen, setRightOpen]   = useState(true);
  // Mobile: which single panel is visible (the 3-panel layout collapses to one at a time)
  const [mobilePanel, setMobilePanel] = useState<"nav" | "question" | "collab">("question");

  // Debounce timer ref for auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load list ──────────────────────────────────────────────────────────────

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const { data } = await api.get("/assignments");
      setAssignments(data.data.assignments || []);
    } catch {
      setListError("Could not load assignments.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // ── Deep-link: open assignment from URL param ───────────────────────────────
  useEffect(() => {
    if (!params?.id || deepLinked) return;
    setDeepLinked(true);
    openWorkspace(params.id, true); // eslint-disable-line react-hooks/exhaustive-deps
  }, [params?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync URL when workspace changes ────────────────────────────────────────
  useEffect(() => {
    if (view === "workspace" && workspace?._id) {
      const target = `/assignment/${workspace._id}`;
      if (!window.location.pathname.endsWith(workspace._id)) {
        setLocation(target, { replace: true });
      }
    } else if (view === "list" && !params?.id) {
      // Only redirect to /assignments if we're NOT mid-way through a deep-link open.
      // If params.id is present we're still loading the workspace from the URL param.
      if (window.location.pathname.startsWith("/assignment/")) {
        setLocation("/assignments", { replace: true });
      }
    }
  }, [view, workspace?._id, params?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Open workspace ─────────────────────────────────────────────────────────

  const openWorkspace = async (id: string, fromDeepLink = false) => {
    setOpeningId(id);
    setListError("");
    try {
      const { data } = await api.get(`/assignments/${id}`);
      const asgn: Assignment = data.data;
      setWorkspace(asgn);
      setCurrentQ(0);
      setAnswers({});
      setSavedQIds(new Set());
      setShowHint({});
      setGrades(null);
      setWsError("");

      // Try loading existing grades
      try {
        const gr = await api.get(`/assignments/${id}/grades`);
        if (gr.data?.data?.graded) {
          setGrades(gr.data.data);
        }
      } catch { /* no grades yet */ }

      // Load activity
      try {
        const act = await api.get(`/assignments/${id}/activity`);
        setActivity((act.data?.data?.activity || []).slice(0, 5));
      } catch { setActivity([]); }

      setView("workspace");
    } catch {
      setListError("Could not load assignment.");
      // If we came here via a deep-link URL and loading failed, redirect back to
      // the list so the user isn't stuck at /assignment/:id with no workspace open.
      if (fromDeepLink) {
        setLocation("/assignments", { replace: true });
      }
    } finally {
      setOpeningId(null);
    }
  };

  // ── Create assignment ──────────────────────────────────────────────────────

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const { data } = await api.post("/assignments", {
        title: createTitle.trim(),
        description: createDesc.trim() || undefined,
        difficulty: createDifficulty.toLowerCase(),
        educationLevel: createEduLevel.trim() || "Secondary",
        numQuestions: createNumQ,
      });
      const newId = data.data._id;
      await loadList();
      setShowCreateDialog(false);
      resetCreateForm();

      // Generate questions
      setGeneratingQ(true);
      try {
        await api.post(`/assignments/${newId}/generate-questions`);
      } catch { /* generation might fail, still open workspace */ }
      setGeneratingQ(false);

      await openWorkspace(newId);
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || "Failed to create assignment.");
    } finally {
      setCreating(false);
      setGeneratingQ(false);
    }
  };

  const resetCreateForm = () => {
    setCreateTitle(""); setCreateDesc("");
    setCreateDifficulty("Medium"); setCreateEduLevel("Secondary");
    setCreateNumQ(5); setCreateError("");
  };

  // ── Auto-save answer ───────────────────────────────────────────────────────

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveAnswer(questionId, value), 800);
  };

  const saveAnswer = async (questionId: string, content: string) => {
    if (!workspace) return;
    try {
      await api.post(`/assignments/${workspace._id}/answers`, { questionId, content });
      setSavedQIds(prev => new Set(prev).add(questionId));
    } catch { /* silently ignore */ }
  };

  // ── Submit for grading ─────────────────────────────────────────────────────

  const submitForGrading = async () => {
    if (!workspace) return;
    setSubmitting(true);
    setWsError("");
    try {
      const { data } = await api.post(`/assignments/${workspace._id}/submit`);
      setGrades(data.data);
      // Refresh activity
      try {
        const act = await api.get(`/assignments/${workspace._id}/activity`);
        setActivity((act.data?.data?.activity || []).slice(0, 5));
      } catch { /* ignore */ }
    } catch (err: any) {
      setWsError(err?.response?.data?.message || "Failed to submit for grading.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Share ──────────────────────────────────────────────────────────────────

  const shareAssignment = async () => {
    if (!workspace) return;
    try {
      const { data } = await api.post(`/assignments/${workspace._id}/share`);
      const token = data.data?.shareToken || workspace.shareToken;
      if (token) {
        navigator.clipboard.writeText(`${window.location.origin}/assignments/join/${token}`);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
        setWorkspace(prev => prev ? { ...prev, shareToken: token, shareEnabled: true } : prev);
      }
    } catch { /* ignore */ }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const gradeForQ = (qId: string) => grades?.grades?.find(g => g.questionId === qId);

  const answeredCount = workspace
    ? workspace.questions.filter(q => savedQIds.has(q._id) || !!answers[q._id]).length
    : 0;

  const questionStatusDot = (q: Question) => {
    const g = gradeForQ(q._id);
    if (g) return GRADE_DOT[g.status];
    if (savedQIds.has(q._id) || !!answers[q._id]) return "bg-blue-400";
    return "bg-muted-foreground/30";
  };

  const isCreator = workspace && user && (workspace.creator._id === user._id);

  const pct = grades ? Math.round((grades.totalScore / (grades.maxScore || 1)) * 100) : 0;

  // ── Back to list ───────────────────────────────────────────────────────────

  const backToList = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setView("list");
    setWorkspace(null);
    setGrades(null);
    loadList();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: LIST
  // ─────────────────────────────────────────────────────────────────────────

  if (view === "list") {
    return (
      <div className="max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                <i className="fa-solid fa-clipboard-list text-primary text-sm" />
              </span>
              Assignments
            </h1>
            <p className="text-muted-foreground text-sm mt-1 ml-0.5">AI-powered collaborative assignments with automated grading.</p>
          </div>
          <button
            onClick={() => { resetCreateForm(); setShowCreateDialog(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm shadow-primary/30"
          >
            <i className="fa-solid fa-plus" />
            New Assignment
          </button>
        </div>

        {/* Error */}
        {listError && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/15 border border-destructive/30 text-destructive">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{listError}
          </div>
        )}

        {/* Generating questions overlay hint */}
        {generatingQ && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/25 text-sm text-foreground">
            <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
            <span><span className="font-semibold text-primary">AI is generating questions…</span> This may take a moment.</span>
          </div>
        )}

        {/* List */}
        {listLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-44 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-16 text-center flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
              <i className="fa-solid fa-clipboard-list text-muted-foreground text-3xl" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Create your first assignment</p>
              <p className="text-sm text-muted-foreground mt-1">AI will generate questions automatically based on your topic.</p>
            </div>
            <button
              onClick={() => { resetCreateForm(); setShowCreateDialog(true); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all"
            >
              <i className="fa-solid fa-plus" />New Assignment
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map(a => {
              const isOwn = user && a.creator._id === user._id;
              const qCount = a.questions?.length ?? 0;
              return (
                <div key={a._id} className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex-shrink-0 ${STATUS_COLORS[a.status]}`}>
                      <i className={`fa-solid ${STATUS_ICONS[a.status]} text-[8px]`} />
                      {STATUS_LABELS[a.status]}
                    </span>
                    {!isOwn && (
                      <span className="text-[10px] font-semibold text-blue-400 bg-blue-400/15 px-1.5 py-0.5 rounded border border-blue-400/25">
                        Shared
                      </span>
                    )}
                  </div>

                  {/* Title & desc */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                      {a.title}
                    </p>
                    {a.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {qCount > 0 && (
                      <span className="flex items-center gap-1">
                        <i className="fa-solid fa-circle-question text-primary/70" />
                        {qCount} question{qCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <i className="fa-solid fa-users text-primary/70" />
                      {a.collaborators.length + 1} member{a.collaborators.length ? "s" : ""}
                    </span>
                    {a.dueDate && (
                      <span className="text-amber-400 flex items-center gap-1">
                        <i className="fa-solid fa-calendar" />
                        Due {fmtDate(a.dueDate)}
                      </span>
                    )}
                  </div>

                  {/* Open button */}
                  <button
                    onClick={() => openWorkspace(a._id)}
                    disabled={openingId === a._id}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                  >
                    {openingId === a._id
                      ? <><Spinner />&nbsp;Opening…</>
                      : <><i className="fa-solid fa-arrow-up-right-from-square" />Open Workspace</>}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Create Dialog ───────────────────────────────────────────────── */}
        <Dialog open={showCreateDialog} onOpenChange={v => { if (!creating && !generatingQ) { setShowCreateDialog(v); if (!v) resetCreateForm(); } }}>
          <DialogContent className="max-w-lg bg-card border-border rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <span className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <i className="fa-solid fa-wand-magic-sparkles text-primary text-xs" />
                </span>
                New Assignment
              </DialogTitle>
            </DialogHeader>

            {createError && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-xs bg-destructive/15 border border-destructive/30 text-destructive">
                <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{createError}
              </div>
            )}

            <form onSubmit={createAssignment} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title *</label>
                <input
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  placeholder="e.g. Chapter 5 — Calculus Problems"
                  required
                  disabled={creating}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-60"
                />
              </div>

              {/* Topic / Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Topic / Description</label>
                <textarea
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                  placeholder="Describe the topic so the AI can generate relevant questions…"
                  rows={3}
                  disabled={creating}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none disabled:opacity-60"
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Difficulty</label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCreateDifficulty(d)}
                      disabled={creating}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all disabled:opacity-60 ${
                        createDifficulty === d
                          ? d === "Easy" ? "bg-emerald-400/20 border-emerald-400/40 text-emerald-400"
                            : d === "Medium" ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
                            : "bg-red-400/20 border-red-400/40 text-red-400"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Education Level & Num Questions */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Education Level</label>
                  <input
                    value={createEduLevel}
                    onChange={e => setCreateEduLevel(e.target.value)}
                    placeholder="Secondary"
                    disabled={creating}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-60"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Questions <span className="text-primary font-bold">{createNumQ}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={createNumQ}
                    onChange={e => setCreateNumQ(Number(e.target.value))}
                    disabled={creating}
                    className="w-full accent-primary mt-2.5 disabled:opacity-60"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground -mt-1">
                    <span>1</span><span>20</span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={creating || !createTitle.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm shadow-primary/30"
              >
                {creating ? (
                  <><Spinner />Creating &amp; Generating Questions…</>
                ) : (
                  <><i className="fa-solid fa-wand-magic-sparkles" />Create &amp; Generate Questions</>
                )}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW: WORKSPACE
  // ─────────────────────────────────────────────────────────────────────────

  if (view === "workspace" && workspace) {
    const questions = workspace.questions || [];
    const totalQ = questions.length;
    const activeQ = questions[currentQ] ?? null;
    const gradeForActive = activeQ ? gradeForQ(activeQ._id) : null;
    const qTypeMeta = activeQ ? QUESTION_TYPE_META[activeQ.type] : null;
    const activeAnswer = activeQ ? (answers[activeQ._id] ?? "") : "";
    const collabs = workspace.collaborators || [];

    return (
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 pb-14 sm:pb-0">

        {/* ── LEFT PANEL: Question sidebar ─────────────────────────────── */}
        <aside className={`flex-shrink-0 bg-card border-r border-border flex-col overflow-hidden w-full sm:w-56 ${
          mobilePanel === "nav" ? "flex" : "hidden sm:flex"
        }`}>
          {/* Back link */}
          <div className="px-3 pt-3 pb-2 border-b border-border">
            <button
              onClick={backToList}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <i className="fa-solid fa-arrow-left text-[10px]" />Back to List
            </button>
          </div>

          {/* Assignment title */}
          <div className="px-3 py-3 border-b border-border">
            <p className="text-xs font-bold text-foreground line-clamp-2 leading-snug">{workspace.title}</p>
            <span className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${STATUS_COLORS[workspace.status]}`}>
              <i className={`fa-solid ${STATUS_ICONS[workspace.status]} text-[7px]`} />
              {STATUS_LABELS[workspace.status]}
            </span>
          </div>

          {/* Progress */}
          {totalQ > 0 && (
            <div className="px-3 py-2.5 border-b border-border">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                <span>{answeredCount} of {totalQ} answered</span>
                <span className="font-semibold text-primary">{Math.round((answeredCount / totalQ) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(answeredCount / totalQ) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Question list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {totalQ === 0 ? (
              <div className="text-center py-6">
                <i className="fa-solid fa-circle-question text-muted-foreground text-xl mb-2" />
                <p className="text-xs text-muted-foreground">No questions yet</p>
              </div>
            ) : (
              questions.map((q, i) => {
                const isActive = currentQ === i;
                const dot = questionStatusDot(q);
                const meta = QUESTION_TYPE_META[q.type];
                return (
                  <button
                    key={q._id}
                    onClick={() => { setCurrentQ(i); setMobilePanel("question"); }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-primary/15 border border-primary/30 text-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                    <span className="text-xs font-semibold flex-shrink-0 w-5">Q{i + 1}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border flex-shrink-0 ${meta.color}`}>
                      <i className={`fa-solid ${meta.icon} mr-0.5 text-[8px]`} />
                      {q.type === "multiple_choice" ? "MC" : q.type === "short_answer" ? "SA" : q.type === "theory" ? "TH" : "PS"}
                    </span>
                    <span className="text-[10px] truncate flex-1">{q.question.slice(0, 28)}{q.question.length > 28 ? "…" : ""}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Submit button */}
          <div className="p-3 border-t border-border">
            {grades ? (
              <div className={`flex items-center justify-center gap-1.5 text-center py-2 rounded-xl text-xs font-bold border ${GRADE_STATUS_COLORS[pct >= 75 ? "correct" : pct >= 40 ? "partial" : "incorrect"]}`}>
                <ScoreIcon pct={pct} className="w-3.5 h-3.5" /> {grades.totalScore}/{grades.maxScore} ({pct}%)
              </div>
            ) : (
              <button
                onClick={submitForGrading}
                disabled={submitting || answeredCount === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm shadow-primary/30"
              >
                {submitting ? <><Spinner />Grading…</> : <><i className="fa-solid fa-paper-plane" />Submit for Grading</>}
              </button>
            )}
          </div>
        </aside>

        {/* ── MAIN PANEL ────────────────────────────────────────────────── */}
        <main className={`flex-1 flex-col overflow-hidden bg-background ${
          mobilePanel === "question" ? "flex" : "hidden sm:flex"
        }`}>
          {/* Error bar */}
          {wsError && (
            <div className="mx-4 mt-3 flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/15 border border-destructive/30 text-destructive flex-shrink-0">
              <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{wsError}
              <button onClick={() => setWsError("")} className="ml-auto"><i className="fa-solid fa-xmark" /></button>
            </div>
          )}

          {/* Grade banner */}
          {grades && (
            <div className={`mx-4 mt-3 flex items-center gap-3 p-3.5 rounded-2xl border flex-shrink-0 ${
              pct >= 75 ? "bg-emerald-400/10 border-emerald-400/25" :
              pct >= 40 ? "bg-amber-400/10 border-amber-400/25" :
                          "bg-red-400/10 border-red-400/25"
            }`}>
              <span className={`flex-shrink-0 ${pct >= 75 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-red-400"}`}>
                <ScoreIcon pct={pct} className="w-7 h-7" />
              </span>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {grades.totalScore} / {grades.maxScore} marks &nbsp;
                  <span className={`text-sm font-bold ${pct >= 75 ? "text-emerald-400" : pct >= 40 ? "text-amber-400" : "text-red-400"}`}>
                    ({pct}%)
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {pct >= 90 ? "Outstanding work!" : pct >= 75 ? "Great job!" : pct >= 50 ? "Good effort, keep practicing!" : "Keep studying — you've got this!"}
                </p>
              </div>
            </div>
          )}

          {/* Scrollable question area */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {totalQ === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                  <i className="fa-solid fa-wand-magic-sparkles text-muted-foreground text-2xl" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">No questions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Questions are being generated by AI.</p>
                </div>
              </div>
            ) : activeQ && qTypeMeta ? (
              <div className="max-w-2xl mx-auto space-y-4">
                {/* Question card */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
                  {/* Type + marks badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border ${qTypeMeta.color}`}>
                      <i className={`fa-solid ${qTypeMeta.icon} text-[10px]`} />
                      {qTypeMeta.label}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border border-border text-muted-foreground bg-muted/50">
                      <i className="fa-solid fa-star text-amber-400 text-[10px]" />
                      {activeQ.marks} mark{activeQ.marks !== 1 ? "s" : ""}
                    </span>
                    {gradeForActive && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border ${GRADE_STATUS_COLORS[gradeForActive.status]}`}>
                        <i className={`fa-solid ${gradeForActive.status === "correct" ? "fa-circle-check" : gradeForActive.status === "partial" ? "fa-circle-half-stroke" : "fa-circle-xmark"} text-[10px]`} />
                        {gradeForActive.score}/{gradeForActive.maxScore}
                      </span>
                    )}
                    {(savedQIds.has(activeQ._id) && !gradeForActive) && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/25">
                        <i className="fa-solid fa-floppy-disk text-[8px]" />saved
                      </span>
                    )}
                  </div>

                  {/* Question text */}
                  <p className="text-base font-medium text-foreground leading-relaxed">{activeQ.question}</p>

                  {/* Multiple choice */}
                  {activeQ.type === "multiple_choice" && activeQ.options && activeQ.options.length > 0 ? (
                    <div className="space-y-2.5">
                      {activeQ.options.map((opt, oi) => {
                        const letter = String.fromCharCode(65 + oi);
                        const isSelected = activeAnswer === opt || activeAnswer === letter;
                        const isCorrectOpt = gradeForActive?.status === "correct" && isSelected;
                        const isWrongOpt   = gradeForActive?.status === "incorrect" && isSelected;
                        return (
                          <button
                            key={oi}
                            onClick={() => !gradeForActive && handleAnswerChange(activeQ._id, opt)}
                            disabled={!!gradeForActive}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all disabled:cursor-default ${
                              isCorrectOpt ? "bg-emerald-400/15 border-emerald-400/50 text-emerald-400" :
                              isWrongOpt   ? "bg-red-400/15 border-red-400/50 text-red-400" :
                              isSelected   ? "bg-primary border-primary text-white shadow-sm shadow-primary/30" :
                                             "border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
                            }`}
                          >
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                              isSelected ? "bg-white/20" : "bg-muted"
                            }`}>
                              {letter}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isCorrectOpt && <i className="fa-solid fa-circle-check text-emerald-400 flex-shrink-0" />}
                            {isWrongOpt   && <i className="fa-solid fa-circle-xmark text-red-400 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Text answer */
                    <div className="space-y-1">
                      <textarea
                        value={activeAnswer}
                        onChange={e => handleAnswerChange(activeQ._id, e.target.value)}
                        disabled={!!gradeForActive}
                        placeholder={
                          activeQ.type === "short_answer" ? "Type your answer here…" :
                          activeQ.type === "theory"       ? "Explain your reasoning in detail…" :
                          "Show your working and answer…"
                        }
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none disabled:opacity-70 disabled:cursor-default"
                      />
                    </div>
                  )}

                  {/* Hint */}
                  {activeQ.hint && (
                    <div>
                      <button
                        onClick={() => setShowHint(prev => ({ ...prev, [activeQ._id]: !prev[activeQ._id] }))}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <i className={`fa-solid ${showHint[activeQ._id] ? "fa-chevron-up" : "fa-lightbulb"} text-amber-400 text-[10px]`} />
                        {showHint[activeQ._id] ? "Hide hint" : "Show hint"}
                      </button>
                      {showHint[activeQ._id] && (
                        <div className="mt-2 p-3 rounded-xl bg-amber-400/10 border border-amber-400/25 text-xs text-amber-400">
                          <i className="fa-solid fa-lightbulb mr-1.5" />{activeQ.hint}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grade feedback */}
                  {gradeForActive && (
                    <div className={`p-4 rounded-xl border space-y-2 ${GRADE_STATUS_COLORS[gradeForActive.status].split(" ").slice(1).join(" ")} border-current/20`}>
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-robot text-primary text-[10px]" />AI Feedback
                      </p>
                      <p className="text-sm text-foreground">{gradeForActive.feedback}</p>
                      {gradeForActive.correction && (
                        <div className="mt-2 pt-2 border-t border-current/10">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Correction</p>
                          <p className="text-sm text-foreground">{gradeForActive.correction}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Bottom navigation */}
          {totalQ > 0 && (
            <div className="flex-shrink-0 border-t border-border bg-card px-6 py-3 flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentQ(p => Math.max(0, p - 1))}
                disabled={currentQ === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-all disabled:opacity-40"
              >
                <i className="fa-solid fa-arrow-left text-xs" />Previous
              </button>
              <span className="text-xs text-muted-foreground font-medium">
                Question <span className="text-foreground font-bold">{currentQ + 1}</span> of <span className="text-foreground font-bold">{totalQ}</span>
              </span>
              <button
                onClick={() => setCurrentQ(p => Math.min(totalQ - 1, p + 1))}
                disabled={currentQ === totalQ - 1}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-all disabled:opacity-40"
              >
                Next<i className="fa-solid fa-arrow-right text-xs" />
              </button>
            </div>
          )}
        </main>

        {/* ── RIGHT PANEL: Collaboration ───────────────────────────────── */}
        <aside className={`flex-shrink-0 border-l border-border bg-card flex-col overflow-hidden transition-all duration-300 w-full ${
          rightOpen ? "sm:w-60" : "sm:w-10"
        } ${mobilePanel === "collab" ? "flex" : "hidden sm:flex"}`}>
          {/* Toggle (desktop only — mobile uses the tab bar) */}
          <div className={`hidden sm:flex items-center border-b border-border flex-shrink-0 ${rightOpen ? "px-3 py-2.5 justify-between" : "justify-center py-2.5"}`}>
            {rightOpen && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Collaboration</p>}
            <button
              onClick={() => setRightOpen(p => !p)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <i className={`fa-solid ${rightOpen ? "fa-chevron-right" : "fa-chevron-left"} text-[10px]`} />
            </button>
          </div>
          {/* Mobile header */}
          <div className="sm:hidden flex items-center justify-between px-3 py-2.5 border-b border-border flex-shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Collaboration</p>
          </div>

          {(rightOpen || mobilePanel === "collab") && (
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">

              {/* Share */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <i className="fa-solid fa-link mr-1" />Share
                </p>
                <button
                  onClick={shareAssignment}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border text-foreground hover:bg-muted transition-all"
                >
                  <i className={`fa-solid ${shareCopied ? "fa-check text-emerald-400" : "fa-copy"} text-[10px]`} />
                  {shareCopied ? "Link copied!" : "Copy share link"}
                </button>
                {workspace.shareEnabled && workspace.shareToken && (
                  <p className="text-[9px] text-muted-foreground font-mono truncate px-1">
                    …/join/{workspace.shareToken.slice(0, 12)}…
                  </p>
                )}
              </div>

              {/* Participants */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <i className="fa-solid fa-users mr-1" />Participants
                </p>
                <div className="space-y-1.5">
                  {/* Creator */}
                  <div className="flex items-center gap-2">
                    <Avatar user={workspace.creator} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{workspace.creator.name}</p>
                    </div>
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-400/15 px-1.5 py-0.5 rounded border border-amber-400/25 flex-shrink-0">creator</span>
                  </div>
                  {collabs.map(c => (
                    <div key={c.user._id} className="flex items-center gap-2">
                      <Avatar user={c.user} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{c.user.name}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground flex-shrink-0 capitalize">{c.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity */}
              {activity.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <i className="fa-solid fa-timeline mr-1" />Activity
                  </p>
                  <div className="space-y-2">
                    {activity.map((a, i) => (
                      <div key={a._id || i} className="flex items-start gap-2">
                        <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className={`fa-solid ${ACTION_ICONS[a.action] || "fa-circle"} text-[7px] text-primary`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-foreground leading-snug">
                            <span className="font-semibold">{a.actor?.name || "Someone"}</span>{" "}{a.detail || a.action}
                          </p>
                          <p className="text-[9px] text-muted-foreground">{timeAgo(a.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activity.length === 0 && (
                <div className="text-center py-4">
                  <i className="fa-solid fa-timeline text-muted-foreground/50 text-lg mb-1" />
                  <p className="text-[10px] text-muted-foreground">No activity yet</p>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── MOBILE TAB BAR ────────────────────────────────────────────── */}
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border flex items-stretch">
          <button
            onClick={() => setMobilePanel("nav")}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
              mobilePanel === "nav" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <ListChecks className="w-4 h-4" />
            Questions
          </button>
          <button
            onClick={() => setMobilePanel("question")}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
              mobilePanel === "question" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <PenSquare className="w-4 h-4" />
            Answer
          </button>
          <button
            onClick={() => setMobilePanel("collab")}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
              mobilePanel === "collab" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Users2 className="w-4 h-4" />
            Team
          </button>
        </nav>
      </div>
    );
  }

  return null;
}
