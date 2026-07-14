import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import api from "@/lib/api";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface ComprehensionQuestion {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface ChapterData {
  lessonId: string;
  title: string;
  content: string;
  comprehensionQuestions: ComprehensionQuestion[];
  generatedAt: string | null;
}

interface LessonMeta {
  _id: string;
  title: string;
  completed: boolean;
  locked: boolean;
  order: number;
  estimatedMinutes: number;
}

type QuizState = "idle" | "active" | "completed";

export default function RoadmapChapter() {
  const { roadmapId, lessonId } = useParams<{ roadmapId: string; lessonId: string }>();
  const [, setLocation] = useLocation();

  const [chapter, setChapter]       = useState<ChapterData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [lessonMeta, setLessonMeta] = useState<LessonMeta | null>(null);
  const [roadmapTitle, setRoadmapTitle] = useState("");
  const [allLessons, setAllLessons] = useState<LessonMeta[]>([]);

  // Comprehension quiz state
  const [quizState, setQuizState]         = useState<QuizState>("idle");
  const [currentQIdx, setCurrentQIdx]     = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [quizAnswers, setQuizAnswers]     = useState<Record<number, string>>({});
  const [quizResults, setQuizResults]     = useState<Record<number, boolean>>({});
  const [quizScore, setQuizScore]         = useState(0);

  const loadChapter = useCallback(async () => {
    if (!roadmapId || !lessonId) return;
    setLoading(true);
    setError("");
    try {
      // Load roadmap metadata and chapter content in parallel
      const [chapterRes, roadmapRes] = await Promise.all([
        api.get(`/roadmaps/${roadmapId}/lessons/${lessonId}/content`),
        api.get(`/roadmaps/${roadmapId}`),
      ]);

      setChapter(chapterRes.data.data);

      const roadmap = roadmapRes.data.data;
      setRoadmapTitle(roadmap.title);
      const lessons = roadmap.lessons || [];
      setAllLessons(lessons);

      const meta = lessons.find((l: LessonMeta) => l._id === lessonId);
      if (meta) {
        setLessonMeta(meta);
        setIsCompleted(meta.completed);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load chapter content.");
    } finally {
      setLoading(false);
    }
  }, [roadmapId, lessonId]);

  useEffect(() => { loadChapter(); }, [loadChapter]);

  const handleMarkComplete = async () => {
    if (!roadmapId || !lessonId || isCompleted) return;
    setCompleting(true);
    try {
      await api.post(`/roadmaps/${roadmapId}/lessons/${lessonId}/complete`);
      setIsCompleted(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not mark complete.");
    } finally {
      setCompleting(false);
    }
  };

  const startQuiz = () => {
    setQuizState("active");
    setCurrentQIdx(0);
    setSelectedAnswer("");
    setQuizAnswers({});
    setQuizResults({});
    setQuizScore(0);
  };

  const submitAnswer = () => {
    if (!selectedAnswer || !chapter) return;
    const q = chapter.comprehensionQuestions[currentQIdx];
    const correct = selectedAnswer === q.correctAnswer;
    const newAnswers = { ...quizAnswers, [currentQIdx]: selectedAnswer };
    const newResults = { ...quizResults, [currentQIdx]: correct };
    setQuizAnswers(newAnswers);
    setQuizResults(newResults);

    if (currentQIdx < chapter.comprehensionQuestions.length - 1) {
      setCurrentQIdx(prev => prev + 1);
      setSelectedAnswer("");
    } else {
      // Completed quiz
      const score = Object.values(newResults).filter(Boolean).length;
      setQuizScore(score);
      setQuizState("completed");
    }
  };

  // Navigate to adjacent lessons
  const currentOrder = lessonMeta?.order ?? -1;
  const nextLesson = allLessons.find(l => l.order === currentOrder + 1 && !l.locked);
  const prevLesson = allLessons.find(l => l.order === currentOrder - 1);

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        {/* Back button skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </div>
        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-7 w-3/4 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted animate-pulse" />
        </div>
        {/* Content skeleton */}
        <div className="bg-card border border-border rounded-2xl p-8 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-40 rounded bg-muted animate-pulse" />
          </div>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className={`h-4 rounded bg-muted animate-pulse`} style={{ width: `${70 + (i % 3) * 10}%` }} />
          ))}
          <div className="h-4 rounded bg-muted animate-pulse w-1/2" />
          <br />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + i * 10}%` }} />
          ))}
        </div>
        <div className="text-center text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Generating comprehensive chapter content…
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-4 space-y-4">
        <button
          onClick={() => setLocation(`/roadmaps`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-xs" />Back to Roadmaps
        </button>
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-8 text-center space-y-4">
          <i className="fa-solid fa-circle-exclamation text-destructive text-3xl" />
          <div>
            <p className="font-semibold text-foreground">Failed to load chapter</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <button
            onClick={loadChapter}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all"
          >
            <i className="fa-solid fa-rotate-right" />Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!chapter) return null;

  const questions = chapter.comprehensionQuestions || [];
  const activeQ = questions[currentQIdx];
  const hasAnsweredCurrent = selectedAnswer !== "";
  const alreadyAnsweredCurrent = quizAnswers[currentQIdx] !== undefined;
  const wasCorrect = quizResults[currentQIdx];

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">

      {/* ── Navigation header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation(`/roadmaps`)}
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex-shrink-0"
        >
          <i className="fa-solid fa-arrow-left text-xs" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">{roadmapTitle}</p>
          <p className="text-xs text-muted-foreground">
            Chapter {(lessonMeta?.order ?? 0) + 1} · {lessonMeta?.estimatedMinutes ?? 60} min read
          </p>
        </div>
        {isCompleted && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-400/15 text-emerald-400 border border-emerald-400/25">
            <i className="fa-solid fa-circle-check text-[10px]" />Completed
          </span>
        )}
      </div>

      {/* ── Chapter title ── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground leading-tight">{chapter.title}</h1>
        {lessonMeta && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <i className="fa-regular fa-clock text-primary/70" />
              ~{lessonMeta.estimatedMinutes} minutes
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold capitalize ${
              lessonMeta.locked ? 'text-muted-foreground border-border' :
              'text-primary border-primary/30 bg-primary/5'
            }`}>
              <i className={`fa-solid ${lessonMeta.locked ? 'fa-lock' : 'fa-book-open'} text-[9px]`} />
              {lessonMeta.locked ? 'Locked' : 'Available'}
            </span>
          </div>
        )}
      </div>

      {/* ── Chapter Content ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Content header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/20">
          <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-book-open text-primary text-xs" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Chapter Content</p>
            {chapter.generatedAt && (
              <p className="text-[11px] text-muted-foreground">AI-generated educational content</p>
            )}
          </div>
        </div>

        {/* Markdown content */}
        <div className="px-6 py-6 prose-container">
          <MarkdownRenderer content={chapter.content} />
        </div>
      </div>

      {/* ── Comprehension Quiz ── */}
      {questions.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-primary/5">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-circle-question text-primary text-xs" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Comprehension Check</p>
              <p className="text-[11px] text-muted-foreground">{questions.length} quick questions to test understanding</p>
            </div>
            {quizState === "completed" && (
              <span className={`text-xs font-bold px-2 py-1 rounded-xl border ${
                quizScore === questions.length
                  ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
                  : quizScore >= Math.ceil(questions.length / 2)
                  ? "text-amber-400 bg-amber-400/10 border-amber-400/25"
                  : "text-red-400 bg-red-400/10 border-red-400/25"
              }`}>
                {quizScore}/{questions.length}
              </span>
            )}
          </div>

          <div className="px-6 py-5">
            {quizState === "idle" && (
              <div className="text-center space-y-3 py-4">
                <p className="text-sm text-muted-foreground">Test your understanding of this chapter</p>
                <button
                  onClick={startQuiz}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
                >
                  <i className="fa-solid fa-play text-xs" />Start Quiz
                </button>
              </div>
            )}

            {quizState === "active" && activeQ && (
              <div className="space-y-4">
                {/* Progress */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Question {currentQIdx + 1} of {questions.length}</span>
                  <div className="flex gap-1">
                    {questions.map((_, i) => (
                      <div key={i} className={`w-5 h-1.5 rounded-full transition-all ${
                        i < currentQIdx ? "bg-primary" : i === currentQIdx ? "bg-primary/60" : "bg-muted"
                      }`} />
                    ))}
                  </div>
                </div>

                {/* Question */}
                <p className="text-base font-medium text-foreground leading-relaxed">{activeQ.question}</p>

                {/* Options */}
                <div className="space-y-2.5">
                  {activeQ.options.map((opt, oi) => {
                    const letter = String.fromCharCode(65 + oi);
                    const isSelected = selectedAnswer === opt;
                    const isAnswered = alreadyAnsweredCurrent;
                    const isCorrect  = opt === activeQ.correctAnswer;
                    const isWrong    = isAnswered && isSelected && !isCorrect;
                    const showCorrect = isAnswered && isCorrect;

                    return (
                      <button
                        key={oi}
                        onClick={() => !isAnswered && setSelectedAnswer(opt)}
                        disabled={isAnswered}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all disabled:cursor-default ${
                          showCorrect ? "bg-emerald-400/15 border-emerald-400/50 text-emerald-400" :
                          isWrong     ? "bg-red-400/15 border-red-400/50 text-red-400" :
                          isSelected  ? "bg-primary border-primary text-white shadow-sm shadow-primary/30" :
                                        "border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isSelected && !isAnswered ? "bg-white/20" : "bg-muted/60"
                        }`}>
                          {letter}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {showCorrect && <i className="fa-solid fa-circle-check flex-shrink-0" />}
                        {isWrong     && <i className="fa-solid fa-circle-xmark flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback after answering */}
                {alreadyAnsweredCurrent && (
                  <div className={`p-3 rounded-xl border text-sm ${
                    wasCorrect
                      ? "bg-emerald-400/10 border-emerald-400/25 text-emerald-400"
                      : "bg-amber-400/10 border-amber-400/25 text-amber-400"
                  }`}>
                    <p className="font-semibold">
                      {wasCorrect ? "✓ Correct!" : "✗ Not quite"}
                    </p>
                    {activeQ.explanation && (
                      <p className="text-sm mt-1 text-foreground">{activeQ.explanation}</p>
                    )}
                  </div>
                )}

                {/* Action button */}
                {!alreadyAnsweredCurrent ? (
                  <button
                    onClick={submitAnswer}
                    disabled={!hasAnsweredCurrent}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-40"
                  >
                    Submit Answer
                  </button>
                ) : currentQIdx < questions.length - 1 ? (
                  <button
                    onClick={submitAnswer}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all"
                  >
                    Next Question <i className="fa-solid fa-arrow-right ml-1 text-xs" />
                  </button>
                ) : null}
              </div>
            )}

            {quizState === "completed" && (
              <div className="space-y-4 py-2">
                {/* Score */}
                <div className={`text-center p-5 rounded-xl border ${
                  quizScore === questions.length
                    ? "bg-emerald-400/10 border-emerald-400/25"
                    : quizScore >= Math.ceil(questions.length / 2)
                    ? "bg-amber-400/10 border-amber-400/25"
                    : "bg-red-400/10 border-red-400/25"
                }`}>
                  <p className={`text-3xl font-bold mb-1 ${
                    quizScore === questions.length ? "text-emerald-400" :
                    quizScore >= Math.ceil(questions.length / 2) ? "text-amber-400" : "text-red-400"
                  }`}>
                    {quizScore}/{questions.length}
                  </p>
                  <p className="text-sm text-foreground font-medium">
                    {quizScore === questions.length ? "Perfect score! You've mastered this chapter." :
                     quizScore >= Math.ceil(questions.length / 2) ? "Good understanding! Review the missed topics." :
                     "Consider re-reading the chapter before continuing."}
                  </p>
                </div>

                {/* Review answers */}
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div key={i} className={`p-3 rounded-xl border text-xs space-y-1 ${
                      quizResults[i] ? "bg-emerald-400/5 border-emerald-400/20" : "bg-red-400/5 border-red-400/20"
                    }`}>
                      <div className="flex items-start gap-2">
                        <i className={`fa-solid ${quizResults[i] ? "fa-circle-check text-emerald-400" : "fa-circle-xmark text-red-400"} mt-0.5 flex-shrink-0`} />
                        <p className="text-foreground font-medium">{q.question}</p>
                      </div>
                      {!quizResults[i] && (
                        <p className="text-muted-foreground ml-5">
                          <span className="font-semibold">Correct: </span>{q.correctAnswer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={startQuiz}
                  className="w-full py-2 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <i className="fa-solid fa-rotate-right mr-1.5" />Retake Quiz
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Complete & Navigation ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Prev lesson */}
        {prevLesson && (
          <button
            onClick={() => setLocation(`/roadmaps/${roadmapId}/chapter/${prevLesson._id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-all"
          >
            <i className="fa-solid fa-arrow-left text-xs" />Previous
          </button>
        )}

        {/* Mark complete */}
        {!isCompleted ? (() => {
          const quizRequired = questions.length > 0;
          const quizDone     = quizState === "completed";
          const locked       = quizRequired && !quizDone;
          return (
            <div className="flex-1 flex flex-col items-stretch gap-1">
              <button
                onClick={handleMarkComplete}
                disabled={completing || locked}
                title={locked ? "Finish the comprehension quiz first" : undefined}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                  locked
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                    : "bg-primary text-white hover:bg-primary/90 shadow-primary/20 disabled:opacity-50"
                }`}
              >
                {completing
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                  : locked
                  ? <><i className="fa-solid fa-lock text-xs" />Complete the quiz first</>
                  : <><i className="fa-solid fa-circle-check" />Mark Chapter Complete</>}
              </button>
              {locked && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Finish the comprehension quiz above to unlock this.
                </p>
              )}
            </div>
          );
        })() : (
          <div className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-400/15 text-emerald-400 border border-emerald-400/25">
            <i className="fa-solid fa-circle-check" />Chapter Completed
          </div>
        )}

        {/* Next lesson */}
        {nextLesson && (
          <button
            onClick={() => setLocation(`/roadmaps/${roadmapId}/chapter/${nextLesson._id}`)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all"
          >
            Next<i className="fa-solid fa-arrow-right text-xs" />
          </button>
        )}
      </div>

      {/* Error notice */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/10 border border-destructive/30 text-destructive">
          <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
          <button onClick={() => setError("")} className="ml-auto"><i className="fa-solid fa-xmark" /></button>
        </div>
      )}
    </div>
  );
}
