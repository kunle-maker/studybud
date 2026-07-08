import { useLocation } from "wouter";

export interface ActionDef {
  key: string;
  label: string;
  icon: string;
  iconColor: string;
  bg: string;
  description: string;
  path: string;
}

export const ACTION_REGISTRY: Record<string, ActionDef> = {
  makeAssignment:    { key: "makeAssignment",    label: "Assignment",      icon: "fa-clipboard-list",      iconColor: "text-violet-400", bg: "bg-violet-400/10", description: "Create a structured assignment",      path: "/assignments"  },
  makeRoadMap:       { key: "makeRoadMap",        label: "Roadmap",         icon: "fa-map",                 iconColor: "text-blue-400",   bg: "bg-blue-400/10",   description: "Build a personalised learning path",  path: "/roadmaps"     },
  makeSummary:       { key: "makeSummary",        label: "Summary",         icon: "fa-file-lines",          iconColor: "text-green-400",  bg: "bg-green-400/10",  description: "Condense this to key points",         path: "/summaries"    },
  makeFlashcards:    { key: "makeFlashcards",     label: "Flashcards",      icon: "fa-clone",               iconColor: "text-yellow-400", bg: "bg-yellow-400/10", description: "Create fast-memorisation cards",      path: "/flashcards"   },
  makeQuiz:          { key: "makeQuiz",           label: "Quiz",            icon: "fa-circle-question",     iconColor: "text-orange-400", bg: "bg-orange-400/10", description: "Test yourself with smart questions",  path: "/quiz"         },
  makePracticeTest:  { key: "makePracticeTest",   label: "Practice Test",   icon: "fa-pen-to-square",       iconColor: "text-red-400",    bg: "bg-red-400/10",    description: "Generate practice exam questions",    path: "/assignments"  },
  makeNotes:         { key: "makeNotes",          label: "Study Notes",     icon: "fa-note-sticky",         iconColor: "text-teal-400",   bg: "bg-teal-400/10",   description: "Generate well-organised notes",       path: "/summaries"    },
  makeRevisionPlan:  { key: "makeRevisionPlan",   label: "Revision Plan",   icon: "fa-calendar-days",       iconColor: "text-indigo-400", bg: "bg-indigo-400/10", description: "Structure your revision sessions",    path: "/roadmaps"     },
  makeStudySchedule: { key: "makeStudySchedule",  label: "Study Schedule",  icon: "fa-clock",               iconColor: "text-cyan-400",   bg: "bg-cyan-400/10",   description: "Plan daily study sessions",           path: "/roadmaps"     },
  makeCheatSheet:    { key: "makeCheatSheet",     label: "Cheat Sheet",     icon: "fa-scroll",              iconColor: "text-pink-400",   bg: "bg-pink-400/10",   description: "Quick-reference summary card",        path: "/summaries"    },
  makeExamPrediction:{ key: "makeExamPrediction", label: "Exam Prediction", icon: "fa-wand-magic-sparkles", iconColor: "text-purple-400", bg: "bg-purple-400/10", description: "Predict likely exam topics",          path: "/assignments"  },
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
  /** Optional pre-filled context to pass to the target page via URL params */
  context?: { subject?: string; topic?: string };
  className?: string;
}

export default function AIActionCards({ userMessage, context, className = "" }: AIActionCardsProps) {
  const [, setLocation] = useLocation();
  const actionKeys = detectActionsFromMessage(userMessage);

  // Don't render anything if no contextual actions detected
  if (actionKeys.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {actionKeys.map(key => {
        const action = ACTION_REGISTRY[key];
        if (!action) return null;

        const params = new URLSearchParams();
        if (context?.subject) params.set("subject", context.subject);
        if (context?.topic)   params.set("topic",   context.topic);
        const href = params.toString() ? `${action.path}?${params}` : action.path;

        return (
          <button
            key={key}
            onClick={() => setLocation(href)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-border/60 ${action.bg} hover:border-border transition-all duration-150 text-left`}
          >
            <i className={`fa-solid ${action.icon} ${action.iconColor} text-xs flex-shrink-0`} />
            <span className="text-xs font-semibold text-foreground">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
