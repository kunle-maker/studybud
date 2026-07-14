import { useState } from "react";
import { useLocation } from "wouter";
import api from "@/lib/api";

export interface ActionDef {
  key: string;
  label: string;
  icon: string;
  iconColor: string;
  bg: string;
  description: string;
}

export const ACTION_REGISTRY: Record<string, ActionDef> = {
  makeAssignment:     { key: "makeAssignment",    label: "Assignment",      icon: "fa-clipboard-list",      iconColor: "text-violet-400", bg: "bg-violet-400/10", description: "Create a structured assignment" },
  makeRoadMap:        { key: "makeRoadMap",        label: "Roadmap",         icon: "fa-map",                 iconColor: "text-blue-400",   bg: "bg-blue-400/10",   description: "Build a personalised learning path" },
  makeSummary:        { key: "makeSummary",        label: "Summary",         icon: "fa-file-lines",          iconColor: "text-green-400",  bg: "bg-green-400/10",  description: "Condense this to key points" },
  makeFlashcards:     { key: "makeFlashcards",     label: "Flashcards",      icon: "fa-clone",               iconColor: "text-yellow-400", bg: "bg-yellow-400/10", description: "Create fast-memorisation cards" },
  makeQuiz:           { key: "makeQuiz",           label: "Quiz",            icon: "fa-circle-question",     iconColor: "text-orange-400", bg: "bg-orange-400/10", description: "Test yourself with smart questions" },
  makePracticeTest:   { key: "makePracticeTest",   label: "Practice Test",   icon: "fa-pen-to-square",       iconColor: "text-red-400",    bg: "bg-red-400/10",    description: "Generate practice exam questions" },
  makeNotes:          { key: "makeNotes",          label: "Study Notes",     icon: "fa-note-sticky",         iconColor: "text-teal-400",   bg: "bg-teal-400/10",   description: "Generate well-organised notes" },
  makeRevisionPlan:   { key: "makeRevisionPlan",   label: "Revision Plan",   icon: "fa-calendar-days",       iconColor: "text-indigo-400", bg: "bg-indigo-400/10", description: "Structure your revision sessions" },
  makeStudySchedule:  { key: "makeStudySchedule",  label: "Study Schedule",  icon: "fa-clock",               iconColor: "text-cyan-400",   bg: "bg-cyan-400/10",   description: "Plan daily study sessions" },
  makeCheatSheet:     { key: "makeCheatSheet",     label: "Cheat Sheet",     icon: "fa-scroll",              iconColor: "text-pink-400",   bg: "bg-pink-400/10",   description: "Quick-reference summary card" },
  makeExamPrediction: { key: "makeExamPrediction", label: "Exam Prediction", icon: "fa-wand-magic-sparkles", iconColor: "text-purple-400", bg: "bg-purple-400/10", description: "Predict likely exam topics" },
};

/**
 * Detect relevant actions from the user's message.
 * Returns [] if nothing specific matched — no default fallback.
 */
export function detectActionsFromMessage(message: string): string[] {
  const msg = message.toLowerCase();
  const actions: string[] = [];

  if (/exam|test tomorrow|revision|revise|upcoming test/.test(msg))
    actions.push("makeRevisionPlan", "makeFlashcards", "makePracticeTest");
  if (/quiz|test me|practice question|mcq/.test(msg))
    actions.push("makeQuiz", "makePracticeTest");
  if (/assignment|homework|task|coursework/.test(msg))
    actions.push("makeAssignment");
  if (/roadmap|study plan|schedule|curriculum/.test(msg))
    actions.push("makeRoadMap", "makeStudySchedule");
  if (/flashcard|memorize|remember|recall/.test(msg))
    actions.push("makeFlashcards");
  if (/summary|summarize|key point|overview|brief|notes|cheat sheet/.test(msg))
    actions.push("makeSummary", "makeCheatSheet");

  return [...new Set(actions)].slice(0, 3);
}

interface AIActionCardsProps {
  userMessage: string;
  /** Context extracted from the ongoing conversation */
  context?: { subject?: string; topic?: string };
  className?: string;
}

export default function AIActionCards({ userMessage, context, className = "" }: AIActionCardsProps) {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState<string | null>(null);
  const [errors, setErrors]   = useState<Record<string, string>>({});

  const actionKeys = detectActionsFromMessage(userMessage);
  if (actionKeys.length === 0) return null;

  // Build generation context from what the AI conversation already knows
  const topic   = context?.topic   || userMessage.slice(0, 120);
  const subject = context?.subject || "general";

  async function handleAction(key: string) {
    if (loading) return;
    setLoading(key);
    setErrors(prev => ({ ...prev, [key]: "" }));

    try {
      /* ── Roadmap actions ──────────────────────────────────────────── */
      if (key === "makeRoadMap" || key === "makeRevisionPlan" || key === "makeStudySchedule") {
        const { data } = await api.post("/roadmaps/generate", {
          topic,
          subject,
          difficulty: "beginner",
        });
        // Navigate directly to the newly-created roadmap detail page
        setLocation(`/roadmaps/${data.data._id}`);
        return;
      }

      /* ── Quiz / Practice Test ─────────────────────────────────────── */
      if (key === "makeQuiz" || key === "makePracticeTest") {
        const text = `Generate quiz questions about: ${topic}. Subject: ${subject}.`;
        const { data } = await api.post("/study-tools/quiz-session", {
          text,
          questionCount: 5,
          subject,
          topic,
        });
        setLocation(`/quiz/${data.data.sessionId}`);
        return;
      }

      /* ── Summary / Notes / Cheat Sheet ───────────────────────────── */
      if (key === "makeSummary" || key === "makeNotes" || key === "makeCheatSheet") {
        const text =
          `Provide a comprehensive educational summary for the following topic:\n\n` +
          `Topic: ${topic}\nSubject: ${subject}\n\n` +
          `Cover the key concepts, definitions, important facts, and main ideas a student needs to know.`;
        await api.post("/summaries", { text });
        // Summaries page shows history — the new item will be at the top
        setLocation("/summaries");
        return;
      }

      /* ── Flashcards ───────────────────────────────────────────────── */
      if (key === "makeFlashcards") {
        const text =
          `Create detailed study flashcards about: ${topic}. ` +
          `Subject: ${subject}. ` +
          `Include key terms with definitions, core concepts, important formulas or rules, and common exam questions with answers.`;
        const { data } = await api.post("/study-tools/flashcards", { text, count: 10 });
        // Pass generated cards to the Flashcards page via sessionStorage
        sessionStorage.setItem("ai_generated_flashcards", JSON.stringify(data.data.flashcards));
        setLocation("/flashcards");
        return;
      }

      /* ── Assignment / Exam Prediction ────────────────────────────── */
      // These need too much structured input to fully auto-create; open the page
      if (key === "makeAssignment" || key === "makeExamPrediction") {
        setLocation("/assignments");
        return;
      }

      // Fallback
      setLocation("/");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to create. Please try again.";
      setErrors(prev => ({ ...prev, [key]: msg }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {actionKeys.map(key => {
        const action   = ACTION_REGISTRY[key];
        if (!action) return null;
        const isActive = loading === key;
        const errMsg   = errors[key];

        return (
          <div key={key} className="flex flex-col gap-0.5">
            <button
              onClick={() => handleAction(key)}
              disabled={!!loading}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border/60 ${action.bg} hover:border-border transition-all duration-150 text-left disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isActive ? (
                <span className="w-3 h-3 border border-current/40 border-t-current rounded-full animate-spin flex-shrink-0" />
              ) : (
                <i className={`fa-solid ${action.icon} ${action.iconColor} text-xs flex-shrink-0`} />
              )}
              <span className="text-xs font-semibold text-foreground">
                {isActive ? "Creating…" : action.label}
              </span>
            </button>
            {errMsg && (
              <p className="text-[10px] text-destructive px-1 max-w-[140px] leading-tight">{errMsg}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
