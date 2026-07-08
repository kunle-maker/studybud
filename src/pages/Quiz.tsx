/**
 * Quiz.tsx — Entry page for creating a new quiz.
 * After generation, navigates to /quiz/:sessionId for persistent state.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import api from "@/lib/api";
import LimitBanner from "@/components/LimitBanner";

export default function Quiz() {
  const [, setLocation] = useLocation();
  const [text,          setText]          = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [loading,       setLoading]       = useState(false);
  const [limitReached,  setLimitReached]  = useState(false);
  const [error,         setError]         = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) { setError("Please enter at least 10 characters."); return; }
    setError(""); setLimitReached(false);
    setLoading(true);
    try {
      const { data } = await api.post("/study-tools/quiz-session", { text, questionCount });
      const { sessionId } = data.data;
      setLocation(`/quiz/${sessionId}`);
    } catch (err: any) {
      if (err?.response?.data?.limitReached) setLimitReached(true);
      else setError(err?.response?.data?.message || "Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Quiz Mode</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Generate a multiple-choice quiz from your study material. Progress saves automatically.
        </p>
      </div>

      {limitReached && <LimitBanner feature="quizzes" />}

      <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
        <form onSubmit={handleGenerate} className="space-y-4 sm:space-y-5">
          {/* Textarea */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              <span>Study Material</span>
              <span className="font-normal normal-case text-muted-foreground/60">{text.length} / 5000</span>
            </label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, 5000))}
              rows={7}
              placeholder="Paste your notes, textbook content, or any material to quiz yourself on…"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Question count */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Number of questions
            </label>
            <div className="flex gap-2">
              {[3, 5, 10].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuestionCount(n)}
                  className={`flex-1 py-2 sm:py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    questionCount === n
                      ? "bg-primary text-white border-primary"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n}
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
            type="submit"
            disabled={loading || text.trim().length < 10}
            className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating quiz…</>
            ) : (
              <><i className="fa-solid fa-circle-question" />Start Quiz</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
