/**
 * QuizSession — persistent, ID-based quiz page.
 * Route: /quiz/:id
 * Saves progress on every answer; rehydrates from DB on reload.
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import api from "@/lib/api";

interface QuizQuestion {
  question:      string;
  options:       string[];
  correctAnswer: string;
  explanation:   string;
}

type AnswerMap = Record<number, string>;
type QuizView  = "loading" | "quiz" | "results" | "error";

export default function QuizSession() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [questions,   setQuestions]   = useState<QuizQuestion[]>([]);
  const [answers,     setAnswers]     = useState<AnswerMap>({});
  const [currentQ,    setCurrentQ]    = useState(0);
  const [view,        setView]        = useState<QuizView>("loading");
  const [showReview,  setShowReview]  = useState(false);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [saving,      setSaving]      = useState(false);

  /* ── Load session ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!id) { setErrorMsg("No session ID."); setView("error"); return; }

    api.get(`/study-tools/quiz-session/${id}`)
      .then(({ data }) => {
        const s = data.data;
        setQuestions(s.questions || []);
        setAnswers(s.answers    || {});
        setCurrentQ(s.currentQ  || 0);
        setView(s.view === "results" ? "results" : "quiz");
      })
      .catch(() => { setErrorMsg("Quiz session not found or expired."); setView("error"); });
  }, [id]);

  /* ── Persist progress ─────────────────────────────────────────────── */
  const saveProgress = useCallback(async (
    newAnswers: AnswerMap,
    newCurrentQ: number,
    newView?: "quiz" | "results"
  ) => {
    if (!id || saving) return;
    setSaving(true);
    try {
      await api.patch(`/study-tools/quiz-session/${id}/progress`, {
        answers: newAnswers,
        currentQ: newCurrentQ,
        ...(newView ? { view: newView } : {}),
      });
    } catch { /* silent — progress will sync on next interaction */ }
    finally { setSaving(false); }
  }, [id, saving]);

  const handleAnswer = (opt: string) => {
    if (answers[currentQ] !== undefined) return;
    const newAnswers = { ...answers, [currentQ]: opt };
    setAnswers(newAnswers);
    saveProgress(newAnswers, currentQ);
  };

  const goNext = () => {
    const nextQ = currentQ + 1;
    if (nextQ < questions.length) {
      setCurrentQ(nextQ);
      saveProgress(answers, nextQ);
    } else {
      setView("results");
      saveProgress(answers, currentQ, "results");
    }
  };

  /* ── Scores ───────────────────────────────────────────────────────── */
  const score      = questions.filter((q, i) => answers[i] === q.correctAnswer).length;
  const pct        = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const gradeLabel = pct >= 90 ? "Excellent" : pct >= 70 ? "Good" : pct >= 50 ? "Keep practising" : "Review needed";
  const gradeColor = pct >= 90 ? "text-emerald-400" : pct >= 70 ? "text-blue-400" : pct >= 50 ? "text-amber-400" : "text-red-400";
  const gradeBg    = pct >= 90 ? "stroke-emerald-400" : pct >= 70 ? "stroke-blue-400" : pct >= 50 ? "stroke-amber-400" : "stroke-red-400";
  const CIRCLE_R   = 48;
  const CIRC       = 2 * Math.PI * CIRCLE_R;
  const scoreDash  = (pct / 100) * CIRC;

  /* ── Loading ──────────────────────────────────────────────────────── */
  if (view === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (view === "error") {
    return (
      <div className="max-w-xl space-y-4">
        <div className="bg-card border border-destructive/30 rounded-2xl p-6 text-center space-y-3">
          <i className="fa-solid fa-circle-exclamation text-destructive text-2xl" />
          <p className="text-sm text-foreground font-medium">{errorMsg}</p>
          <button
            onClick={() => setLocation("/quiz")}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all"
          >
            Start a New Quiz
          </button>
        </div>
      </div>
    );
  }

  /* ── Quiz view ────────────────────────────────────────────────────── */
  if (view === "quiz") {
    const q        = questions[currentQ];
    const selected = answers[currentQ];
    const answered = selected !== undefined;

    if (!q) return null;

    return (
      <div className="max-w-2xl space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setLocation("/quiz")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
            <span className="hidden sm:inline">Back to Quiz</span>
          </button>
          {saving && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <span className="w-2 h-2 border border-muted-foreground/30 border-t-muted-foreground/60 rounded-full animate-spin" />
              Saving…
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Question {currentQ + 1} / {questions.length}</span>
            <span>{Object.keys(answers).length} answered</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((currentQ) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">
              {currentQ + 1}
            </span>
            <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed pt-0.5">{q.question}</p>
          </div>

          <div className="space-y-2 pl-10 sm:pl-11">
            {q.options.map(opt => {
              const isSelected = selected === opt;
              const isCorrect  = q.correctAnswer === opt;
              let cls = "border border-border hover:border-primary/40 hover:bg-muted/30 text-foreground";
              if (answered) {
                if (isCorrect)                     cls = "border-emerald-400/50 bg-emerald-400/10 text-foreground";
                else if (isSelected && !isCorrect) cls = "border-destructive/50 bg-destructive/10 text-foreground";
                else                               cls = "border-border text-muted-foreground opacity-50";
              } else if (isSelected) {
                cls = "border-primary bg-primary/10 text-foreground";
              }
              return (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  disabled={answered}
                  className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm transition-all flex items-center gap-3 ${cls}`}
                >
                  {answered && isCorrect    && <i className="fa-solid fa-check text-emerald-400 flex-shrink-0 text-xs" />}
                  {answered && isSelected && !isCorrect && <i className="fa-solid fa-xmark text-destructive flex-shrink-0 text-xs" />}
                  {(!answered || (!isCorrect && !isSelected)) && (
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isSelected ? "border-primary bg-primary" : "border-border"}`} />
                  )}
                  {opt}
                </button>
              );
            })}
          </div>

          {answered && (
            <div className={`ml-10 sm:ml-11 p-3 rounded-xl text-xs leading-relaxed border ${
              selected === q.correctAnswer
                ? "border-emerald-400/25 text-emerald-300"
                : "border-amber-400/25 text-amber-300"
            }`} style={{ background: selected === q.correctAnswer ? "rgba(52,211,153,0.08)" : "rgba(251,191,36,0.08)" }}>
              <i className="fa-solid fa-circle-info mr-1.5" />{q.explanation}
            </div>
          )}

          {answered && (
            <div className="pl-10 sm:pl-11">
              <button
                onClick={goNext}
                className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all"
              >
                {currentQ < questions.length - 1
                  ? <><i className="fa-solid fa-arrow-right" />Next Question</>
                  : <><i className="fa-solid fa-flag-checkered" />See Results</>}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Results view ─────────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl space-y-4 sm:space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto">
          <svg width="100%" height="100%" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r={CIRCLE_R} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/40" />
            <circle cx="64" cy="64" r={CIRCLE_R} fill="none" strokeWidth="8"
              strokeDasharray={`${scoreDash} ${CIRC}`} strokeLinecap="round" className={gradeBg} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl sm:text-2xl font-bold ${gradeColor}`}>{pct}%</span>
          </div>
        </div>

        <div>
          <p className={`text-lg sm:text-xl font-bold ${gradeColor}`}>{gradeLabel}</p>
          <p className="text-sm text-muted-foreground mt-1">
            You got <span className="font-semibold text-foreground">{score}</span> out of{" "}
            <span className="font-semibold text-foreground">{questions.length}</span> correct
          </p>
        </div>

        <div className="flex gap-3 justify-center pt-2 flex-wrap">
          <button
            onClick={() => { setLocation("/quiz"); }}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <i className="fa-solid fa-rotate-left" />New Quiz
          </button>
          <button
            onClick={() => setShowReview(r => !r)}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <i className={`fa-solid ${showReview ? "fa-chevron-up" : "fa-list-check"}`} />
            {showReview ? "Hide" : "Review"}
          </button>
        </div>
      </div>

      {showReview && (
        <div className="space-y-3">
          {questions.map((q, qi) => {
            const yours   = answers[qi];
            const correct = q.correctAnswer;
            const isRight = yours === correct;
            return (
              <div key={qi} className={`bg-card border rounded-2xl p-4 sm:p-5 space-y-3 ${isRight ? "border-emerald-400/25" : "border-red-400/25"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${isRight ? "bg-emerald-400/15" : "bg-red-400/15"}`}>
                    <i className={`fa-solid ${isRight ? "fa-check text-emerald-400" : "fa-xmark text-red-400"} text-xs`} />
                  </div>
                  <p className="text-sm font-medium text-foreground leading-relaxed">{q.question}</p>
                </div>
                <div className="pl-9 sm:pl-10 space-y-1 text-xs">
                  <p><span className="text-muted-foreground">Your answer: </span>
                    <span className={isRight ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>{yours || "Not answered"}</span>
                  </p>
                  {!isRight && (
                    <p><span className="text-muted-foreground">Correct: </span>
                      <span className="text-emerald-400 font-semibold">{correct}</span>
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1.5 leading-relaxed">
                    <i className="fa-solid fa-circle-info mr-1" />{q.explanation}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
