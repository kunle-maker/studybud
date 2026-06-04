import { useState } from "react";
import api from "@/lib/api";
import LimitBanner from "@/components/LimitBanner";

interface QuizQuestion {
  question:      string;
  options:       string[];
  correctAnswer: string;
  explanation:   string;
}

type AnswerMap = Record<number, string>;

export default function Quiz() {
  const [text,          setText]          = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [quiz,          setQuiz]          = useState<QuizQuestion[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [limitReached,  setLimitReached]  = useState(false);
  const [error,         setError]         = useState("");
  const [answers,       setAnswers]       = useState<AnswerMap>({});
  const [submitted,     setSubmitted]     = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 10) { setError("Please enter at least 10 characters."); return; }
    setError(""); setLimitReached(false); setQuiz([]); setAnswers({}); setSubmitted(false);
    setLoading(true);
    try {
      const { data } = await api.post("/study-tools/quiz", { text, questionCount });
      setQuiz(data.data.quiz);
    } catch (err: any) {
      if (err?.response?.data?.limitReached) setLimitReached(true);
      else setError(err?.response?.data?.message || "Failed to generate quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qi: number, option: string) => {
    if (!submitted) setAnswers(prev => ({ ...prev, [qi]: option }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < quiz.length) { setError("Please answer all questions before submitting."); return; }
    setError("");
    setSubmitted(true);
  };

  const score       = submitted ? quiz.filter((q, i) => answers[i] === q.correctAnswer).length : 0;
  const allAnswered = Object.keys(answers).length === quiz.length;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quiz Mode</h1>
        <p className="text-muted-foreground text-sm mt-1">Generate a multiple-choice quiz from your study material and test yourself.</p>
      </div>

      {limitReached && <LimitBanner feature="quizzes" />}

      {quiz.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Study Material
                <span className="ml-2 font-normal normal-case text-muted-foreground/70">{text.length}/5000 chars</span>
              </label>
              <textarea
                data-testid="input-text"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 5000))}
                rows={7}
                placeholder="Paste your notes or textbook content…"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Number of questions</label>
              <select
                data-testid="select-count"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              >
                {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-destructive flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation" />{error}</p>}
            <button
              data-testid="btn-generate"
              type="submit"
              disabled={loading || text.trim().length < 10}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm"
              style={{ background: "hsl(217 91% 48%)" }}
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating quiz…</>
              ) : (
                <><i className="fa-solid fa-circle-question" />Generate Quiz</>
              )}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Score banner */}
          {submitted && (
            <div data-testid="quiz-score" className={`flex items-center gap-4 p-5 rounded-2xl border ${
              score === quiz.length ? "border-emerald-400/35" :
              score >= quiz.length * 0.7 ? "border-blue-400/35" :
              "border-amber-400/35"
            }`}
            style={{
              background: score === quiz.length ? "rgba(52,211,153,0.15)" :
                          score >= quiz.length * 0.7 ? "rgba(96,165,250,0.15)" :
                          "rgba(251,191,36,0.15)"
            }}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                score === quiz.length ? "bg-emerald-500/20" :
                score >= quiz.length * 0.7 ? "bg-blue-500/20" :
                "bg-amber-500/20"
              }`}>
                <i className={`fa-solid text-xl ${
                  score === quiz.length ? "fa-trophy text-emerald-300" :
                  score >= quiz.length * 0.7 ? "fa-star text-blue-300" :
                  "fa-book text-amber-300"
                }`} />
              </div>
              <div>
                <p className="font-bold text-foreground text-lg">{score}/{quiz.length} correct</p>
                <p className="text-sm text-muted-foreground">
                  {score === quiz.length ? "Perfect score! Excellent work." :
                   score >= quiz.length * 0.7 ? "Great job! Keep it up." :
                   "Keep studying — you'll get there!"}
                </p>
              </div>
              <button
                data-testid="btn-retake"
                onClick={() => setQuiz([])}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              >
                <i className="fa-solid fa-rotate-left" />Retake
              </button>
            </div>
          )}

          {/* Questions */}
          <div className="space-y-4">
            {quiz.map((q, qi) => {
              const selected  = answers[qi];
              const correct   = q.correctAnswer;
              const isCorrect = selected === correct;
              return (
                <div key={qi} data-testid={`question-${qi}`} className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-xs">{qi + 1}</span>
                    <p className="text-sm font-semibold text-foreground leading-relaxed">{q.question}</p>
                  </div>
                  <div className="space-y-2 pl-10">
                    {q.options.map((opt) => {
                      let cls     = "border border-border hover:border-primary/40 hover:bg-accent/30";
                      let inStyle = {};
                      if (submitted) {
                        if (opt === correct) {
                          cls     = "border-emerald-400/50";
                          inStyle = { background: "rgba(52,211,153,0.15)" };
                        } else if (opt === selected && !isCorrect) {
                          cls = "border-destructive bg-destructive/10";
                        } else {
                          cls = "border-border opacity-50";
                        }
                      } else if (selected === opt) {
                        cls = "border-primary bg-primary/10";
                      }
                      return (
                        <button
                          key={opt}
                          data-testid={`option-${qi}-${opt.slice(0, 10)}`}
                          onClick={() => handleAnswer(qi, opt)}
                          disabled={submitted}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm text-foreground transition-all flex items-center gap-3 ${cls}`}
                          style={inStyle}
                        >
                          {submitted && opt === correct   && <i className="fa-solid fa-check text-emerald-400 flex-shrink-0 text-xs" />}
                          {submitted && opt === selected  && !isCorrect && <i className="fa-solid fa-xmark text-destructive flex-shrink-0 text-xs" />}
                          {(!submitted || (submitted && opt !== correct && opt !== selected)) && (
                            <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selected === opt ? "border-primary bg-primary" : "border-border"}`} />
                          )}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {submitted && (
                    <div className={`ml-10 p-3 rounded-xl text-xs leading-relaxed border ${
                      isCorrect ? "border-emerald-400/30 text-emerald-200" : "border-amber-400/30 text-amber-200"
                    }`}
                    style={{ background: isCorrect ? "rgba(52,211,153,0.12)" : "rgba(251,191,36,0.12)" }}>
                      <i className="fa-solid fa-circle-info mr-1.5" />
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!submitted && (
            <div className="sticky bottom-4">
              {error && <p className="text-sm text-destructive mb-2 flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation" />{error}</p>}
              <button
                data-testid="btn-submit"
                onClick={handleSubmit}
                disabled={!allAnswered}
                className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 shadow-md"
                style={{ background: "hsl(217 91% 48%)" }}
              >
                <i className="fa-solid fa-check mr-2" />
                Submit Quiz ({Object.keys(answers).length}/{quiz.length} answered)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
