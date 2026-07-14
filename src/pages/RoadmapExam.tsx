import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import api from "@/lib/api";

interface ObjectiveQuestion {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface TheoryQuestion {
  _id: string;
  question: string;
  markScheme: string;
  maxScore: number;
}

interface TheoryGrade {
  questionIndex: number;
  score: number;
  maxScore: number;
  feedback: string;
  correction: string;
}

interface ExamSession {
  _id: string;
  status: "pending" | "in_progress" | "submitted" | "graded";
  objectiveQuestions: ObjectiveQuestion[];
  theoryQuestions: TheoryQuestion[];
  objectiveAnswers: { questionIndex: number; answer: string }[];
  theoryAnswers:    { questionIndex: number; answer: string }[];
  selectedTheoryIndices: number[];
  objectiveScore: number;
  theoryScore:    number;
  totalScore:     number;
  theoryGrades:   TheoryGrade[];
  performanceSummary: string;
  recommendations:    string;
  timeLimitMinutes: number;
  startedAt: string;
  submittedAt: string | null;
}

type ExamTab = "objective" | "theory";
type ExamView = "loading" | "generating" | "exam" | "submitting" | "results" | "error";

const TIME_LIMIT_MINUTES = 90;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function RoadmapExam() {
  const { roadmapId } = useParams<{ roadmapId: string }>();
  const [, setLocation] = useLocation();

  const [view, setView]               = useState<ExamView>("loading");
  const [exam, setExam]               = useState<ExamSession | null>(null);
  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [error, setError]             = useState("");
  const [activeTab, setActiveTab]     = useState<ExamTab>("objective");

  // Answers state
  const [objAnswers, setObjAnswers]         = useState<Record<number, string>>({});
  const [theoryAnswers, setTheoryAnswers]   = useState<Record<number, string>>({});
  const [selectedTheory, setSelectedTheory] = useState<Set<number>>(new Set());

  // Timer
  const [timeLeft, setTimeLeft]   = useState(TIME_LIMIT_MINUTES * 60);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load or start exam
  const loadOrStartExam = useCallback(async () => {
    if (!roadmapId) return;
    setView("loading");
    setError("");
    try {
      // Load roadmap title
      const roadmapRes = await api.get(`/roadmaps/${roadmapId}`);
      setRoadmapTitle(roadmapRes.data.data.title);

      // Try to get existing exam
      try {
        const examRes = await api.get(`/roadmaps/${roadmapId}/exam`);
        const existingExam: ExamSession = examRes.data.data;
        setExam(existingExam);

        if (existingExam.status === "graded") {
          setView("results");
        } else {
          // Restore in-progress answers
          const obj: Record<number, string> = {};
          existingExam.objectiveAnswers.forEach(a => { obj[a.questionIndex] = a.answer; });
          const thy: Record<number, string> = {};
          existingExam.theoryAnswers.forEach(a => { thy[a.questionIndex] = a.answer; });
          setObjAnswers(obj);
          setTheoryAnswers(thy);
          setSelectedTheory(new Set(existingExam.selectedTheoryIndices));
          setView("exam");
          startTimer(existingExam.startedAt);
        }
      } catch {
        // No exam — generate one
        setView("generating");
        const startRes = await api.post(`/roadmaps/${roadmapId}/exam/start`);
        const newExam: ExamSession = startRes.data.data;
        setExam(newExam);
        setView("exam");
        startTimer(newExam.startedAt);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load exam.");
      setView("error");
    }
  }, [roadmapId]);

  useEffect(() => { loadOrStartExam(); }, [loadOrStartExam]);

  // Timer logic
  const startTimer = (startedAt: string) => {
    const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const remaining = Math.max(0, TIME_LIMIT_MINUTES * 60 - elapsed);
    setTimeLeft(remaining);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current)   clearInterval(timerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleAutoSubmit = () => {
    if (exam?.status === "in_progress") handleSubmit(true);
  };

  // Answer handlers with auto-save
  const handleObjAnswer = (questionIndex: number, answer: string) => {
    setObjAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    autoSave("objective", questionIndex, answer);
  };

  const handleTheoryAnswer = (questionIndex: number, answer: string) => {
    setTheoryAnswers(prev => ({ ...prev, [questionIndex]: answer }));
    if (answer.trim()) setSelectedTheory(prev => new Set([...prev, questionIndex]));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      autoSave("theory", questionIndex, answer);
    }, 1000);
  };

  const autoSave = async (type: "objective" | "theory", questionIndex: number, answer: string) => {
    if (!roadmapId || !exam) return;
    try {
      await api.patch(`/roadmaps/${roadmapId}/exam/answers`, { type, questionIndex, answer });
    } catch { /* silent */ }
  };

  const handleSubmit = async (auto = false) => {
    if (!roadmapId || !exam) return;

    // Check theory — need at least 3 answered
    const answeredTheoryCount = Object.values(theoryAnswers).filter(a => a.trim()).length;
    if (!auto && answeredTheoryCount < 3) {
      setError("Please answer at least 3 theory questions before submitting.");
      return;
    }

    setError("");
    setView("submitting");
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await api.post(`/roadmaps/${roadmapId}/exam/submit`);
      setExam(res.data.data);
      setView("results");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to submit exam.");
      setView("exam");
    }
  };

  // Computed values
  const objAnsweredCount = Object.keys(objAnswers).length;
  const theoryAnsweredCount = Object.values(theoryAnswers).filter(a => a.trim()).length;
  const timerColor = timeLeft < 600 ? "text-red-400" : timeLeft < 1800 ? "text-amber-400" : "text-foreground";

  if (view === "loading") {
    return (
      <div className="max-w-4xl mx-auto py-8 flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
        <p className="text-base font-semibold text-foreground">Loading Exam…</p>
      </div>
    );
  }

  if (view === "generating") {
    return (
      <div className="max-w-4xl mx-auto py-12 flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center">
          <span className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-foreground">Generating Final Exam</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            AI is creating a comprehensive examination based on all chapters you've completed.
            This may take up to a minute…
          </p>
        </div>
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <span key={i} className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (view === "error") {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-4">
        <button onClick={() => setLocation(`/roadmaps`)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <i className="fa-solid fa-arrow-left text-xs" />Back to Roadmaps
        </button>
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-8 text-center space-y-4">
          <i className="fa-solid fa-circle-exclamation text-destructive text-3xl" />
          <div>
            <p className="font-semibold text-foreground">Could not load exam</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={loadOrStartExam} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all">
              <i className="fa-solid fa-rotate-right" />Try Again
            </button>
            <button onClick={() => setLocation(`/roadmaps`)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-all">
              Back to Roadmaps
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "submitting") {
    return (
      <div className="max-w-4xl mx-auto py-12 flex flex-col items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center">
          <span className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-foreground">Grading Your Exam</p>
          <p className="text-sm text-muted-foreground">AI is reviewing your theory answers and calculating your score…</p>
        </div>
      </div>
    );
  }

  if (view === "results" && exam) {
    const pct = Math.round((exam.totalScore / 60) * 100);
    const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F";
    const gradeColor = pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400";
    const gradeBg    = pct >= 70 ? "bg-emerald-400/10 border-emerald-400/25" : pct >= 50 ? "bg-amber-400/10 border-amber-400/25" : "bg-red-400/10 border-red-400/25";

    return (
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation(`/roadmaps`)} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <i className="fa-solid fa-arrow-left text-xs" />
          </button>
          <div>
            <p className="text-xs text-muted-foreground">{roadmapTitle}</p>
            <p className="text-sm font-semibold text-foreground">Final Examination Results</p>
          </div>
        </div>

        {/* Score card */}
        <div className={`rounded-2xl border p-8 text-center space-y-4 ${gradeBg}`}>
          <div className={`text-7xl font-black ${gradeColor}`}>{grade}</div>
          <div className={`text-4xl font-bold ${gradeColor}`}>
            {exam.totalScore}<span className="text-2xl text-muted-foreground">/60</span>
          </div>
          <p className={`text-lg font-semibold ${gradeColor}`}>{pct}%</p>
          <p className="text-sm text-foreground max-w-sm mx-auto">
            {pct >= 90 ? "Outstanding! You've mastered this subject." :
             pct >= 70 ? "Great work! Solid understanding demonstrated." :
             pct >= 50 ? "Good effort. Some areas need more attention." :
             "Keep studying — revisit the chapters and try again."}
          </p>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Objective Section</p>
            <p className="text-3xl font-bold text-foreground">{exam.objectiveScore}<span className="text-lg text-muted-foreground">/15</span></p>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(exam.objectiveScore / 15) * 100}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{Math.round((exam.objectiveScore / 15) * 100)}% — {exam.objectiveScore} correct of 15</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theory Section</p>
            <p className="text-3xl font-bold text-foreground">{exam.theoryScore}<span className="text-lg text-muted-foreground">/45</span></p>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(exam.theoryScore / 45) * 100}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{Math.round((exam.theoryScore / 45) * 100)}% — 3 questions × 15 marks</p>
          </div>
        </div>

        {/* Performance summary */}
        {exam.performanceSummary && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-robot text-primary text-[10px]" />
              </div>
              <p className="text-sm font-semibold text-foreground">AI Performance Analysis</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{exam.performanceSummary}</p>
            {exam.recommendations && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recommendations</p>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{exam.recommendations}</div>
              </div>
            )}
          </div>
        )}

        {/* Theory grades detail */}
        {exam.theoryGrades.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Theory Answer Feedback</p>
            </div>
            <div className="divide-y divide-border">
              {exam.theoryGrades.map((g, i) => {
                const q = exam.theoryQuestions[g.questionIndex];
                const scorePct = Math.round((g.score / g.maxScore) * 100);
                return (
                  <div key={i} className="px-5 py-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className={`text-xs font-bold px-2 py-1 rounded-xl border flex-shrink-0 ${
                        scorePct >= 70 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" :
                        scorePct >= 50 ? "text-amber-400 bg-amber-400/10 border-amber-400/25" :
                                         "text-red-400 bg-red-400/10 border-red-400/25"
                      }`}>
                        {g.score}/{g.maxScore}
                      </div>
                      <p className="text-sm font-medium text-foreground leading-snug">{q?.question}</p>
                    </div>
                    <p className="text-sm text-muted-foreground ml-12 leading-relaxed">{g.feedback}</p>
                    {g.correction && (
                      <div className="ml-12 p-2.5 rounded-xl bg-muted/50 border border-border">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Model Answer</p>
                        <p className="text-xs text-foreground">{g.correction}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setLocation(`/roadmaps`)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-all"
          >
            <i className="fa-solid fa-map text-xs" />Back to Roadmaps
          </button>
          <button
            onClick={loadOrStartExam}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
          >
            <i className="fa-solid fa-rotate-right text-xs" />Retake Exam
          </button>
        </div>
      </div>
    );
  }

  if (!exam || view !== "exam") return null;

  // ── Active exam UI ──
  const objQs   = exam.objectiveQuestions;
  const theoryQs = exam.theoryQuestions;

  return (
    <div className="max-w-4xl mx-auto space-y-5 py-4">

      {/* ── Exam header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground">{roadmapTitle}</p>
          <h1 className="text-xl font-bold text-foreground">Final Examination</h1>
        </div>
        {/* Timer */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono text-lg font-bold ${timerColor} ${
          timeLeft < 600 ? "bg-red-400/10 border-red-400/25 animate-pulse" :
          timeLeft < 1800 ? "bg-amber-400/10 border-amber-400/25" :
          "bg-card border-border"
        }`}>
          <i className={`fa-solid fa-clock text-sm ${timerColor}`} />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* ── Exam info bar ── */}
      <div className="flex gap-2 flex-wrap text-xs">
        <span className="px-3 py-1.5 rounded-xl bg-card border border-border text-muted-foreground">
          <i className="fa-solid fa-circle-check text-primary mr-1" />
          Objective: {objAnsweredCount}/{objQs.length} answered
        </span>
        <span className="px-3 py-1.5 rounded-xl bg-card border border-border text-muted-foreground">
          <i className="fa-solid fa-pen-to-square text-primary mr-1" />
          Theory: {theoryAnsweredCount}/3 answered (choose any 3)
        </span>
        <span className="px-3 py-1.5 rounded-xl bg-card border border-border text-muted-foreground">
          <i className="fa-solid fa-star text-amber-400 mr-1" />
          Total: 60 marks
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
          <button onClick={() => setError("")} className="ml-auto"><i className="fa-solid fa-xmark" /></button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {(["objective", "theory"] as ExamTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              activeTab === tab
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "objective"
              ? `Objective (${objAnsweredCount}/${objQs.length})`
              : `Theory (${theoryAnsweredCount}/3)`
            }
          </button>
        ))}
      </div>

      {/* ── Objective section ── */}
      {activeTab === "objective" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <i className="fa-solid fa-circle-info text-primary/70" />
            15 multiple-choice questions · 1 mark each · 15 marks total
          </div>

          {objQs.map((q, qi) => {
            const selected = objAnswers[qi];
            return (
              <div key={q._id} className={`bg-card border rounded-2xl p-5 space-y-4 transition-all ${
                selected ? "border-primary/30" : "border-border"
              }`}>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {qi + 1}
                  </span>
                  <p className="text-sm font-medium text-foreground leading-relaxed flex-1">{q.question}</p>
                  {selected && (
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                      <i className="fa-solid fa-check text-primary text-[10px]" />
                    </span>
                  )}
                </div>

                <div className="space-y-2 ml-10">
                  {q.options.map((opt, oi) => {
                    const letter = String.fromCharCode(65 + oi);
                    const isSelected = selected === opt;
                    return (
                      <button
                        key={oi}
                        onClick={() => handleObjAnswer(qi, opt)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm text-left transition-all ${
                          isSelected
                            ? "bg-primary border-primary text-white shadow-sm shadow-primary/30"
                            : "border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isSelected ? "bg-white/20" : "bg-muted"
                        }`}>{letter}</span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Theory section ── */}
      {activeTab === "theory" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-400/10 border border-amber-400/25 text-xs text-amber-400">
            <i className="fa-solid fa-circle-info flex-shrink-0" />
            Answer <strong>any 3</strong> of the 5 theory questions. Each is worth 15 marks (45 marks total). AI will grade your answers.
          </div>

          {theoryQs.map((q, qi) => {
            const answer = theoryAnswers[qi] || "";
            const isAnswered = answer.trim().length > 0;
            return (
              <div key={q._id} className={`bg-card border rounded-2xl p-5 space-y-3 transition-all ${
                isAnswered ? "border-primary/30" : "border-border"
              }`}>
                <div className="flex items-start gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
                    isAnswered
                      ? "bg-primary/15 border-primary/30 text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }`}>
                    {qi + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-medium text-foreground leading-relaxed">{q.question}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{q.maxScore} marks</span>
                  </div>
                </div>

                <textarea
                  value={answer}
                  onChange={e => handleTheoryAnswer(qi, e.target.value)}
                  placeholder="Write your answer here. Be thorough and organised — AI will grade your response."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none ml-10 w-[calc(100%-2.5rem)]"
                  style={{ marginLeft: "2.5rem", width: "calc(100% - 2.5rem)" }}
                />

                <div className="ml-10 flex items-center gap-2 text-xs text-muted-foreground">
                  <i className={`fa-solid ${isAnswered ? "fa-circle-check text-primary" : "fa-circle text-muted-foreground/30"}`} />
                  {isAnswered ? `${answer.trim().split(/\s+/).length} words` : "Not answered"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Submit button ── */}
      <div className="sticky bottom-4 pt-4">
        <button
          onClick={() => handleSubmit()}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/30"
        >
          <i className="fa-solid fa-paper-plane" />
          Submit Exam · {objAnsweredCount}/{objQs.length} objective · {theoryAnsweredCount}/3 theory
        </button>
      </div>
    </div>
  );
}
