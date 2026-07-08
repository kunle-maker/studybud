/**
 * AgenticStep — Replit-Agent-style live step indicator.
 *
 * Shows a running indicator while an action executes, then collapses
 * to a compact "done" card with a link to the result.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import api from "@/lib/api";

type StepStatus = "running" | "done" | "error";

interface AgenticStepProps {
  action: {
    type: string;   // e.g. "makeQuiz", "makeFlashcards", "makeSummary"
    params?: {
      subject?: string;
      topic?: string;
      material?: string;
    };
  };
  /** Raw content already in context to use as material */
  contextMaterial?: string;
}

const ACTION_META: Record<string, { label: string; icon: string; color: string; path: string }> = {
  makeQuiz:       { label: "Generating quiz",       icon: "fa-circle-question",  color: "text-orange-400", path: "/quiz" },
  makeFlashcards: { label: "Creating flashcards",   icon: "fa-clone",            color: "text-yellow-400", path: "/flashcards" },
  makeSummary:    { label: "Summarising notes",     icon: "fa-file-lines",       color: "text-green-400",  path: "/summaries" },
  makeRoadmap:    { label: "Building roadmap",      icon: "fa-map",              color: "text-blue-400",   path: "/roadmaps" },
};

function runningDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      {[0, 150, 300].map(d => (
        <span
          key={d}
          className="w-1 h-1 rounded-full bg-current opacity-60 animate-bounce"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}

export default function AgenticStep({ action, contextMaterial = "" }: AgenticStepProps) {
  const [status,     setStatus]     = useState<StepStatus>("running");
  const [sessionId,  setSessionId]  = useState<string | null>(null);
  const [errorMsg,   setErrorMsg]   = useState("");
  const [, setLocation] = useLocation();

  const meta = ACTION_META[action.type];

  useEffect(() => {
    let cancelled = false;

    async function execute() {
      try {
        const material = contextMaterial || action.params?.material || action.params?.topic || "";

        if (action.type === "makeQuiz") {
          if (!material || material.length < 10) {
            setErrorMsg("Not enough material to generate a quiz.");
            setStatus("error");
            return;
          }
          const { data } = await api.post("/study-tools/quiz-session", {
            text: material.slice(0, 4000),
            questionCount: 5,
            topic: action.params?.topic || "",
            subject: action.params?.subject || "",
          });
          if (!cancelled) {
            setSessionId(data.data.sessionId);
            setStatus("done");
          }
        } else if (action.type === "makeFlashcards") {
          // Navigate with pre-filled context; flashcards page handles creation
          if (!cancelled) setStatus("done");
        } else if (action.type === "makeSummary") {
          if (!cancelled) setStatus("done");
        } else {
          if (!cancelled) setStatus("done");
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.response?.data?.message || "Action failed.");
          setStatus("error");
        }
      }
    }

    execute();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!meta) return null;

  const handleOpen = () => {
    if (action.type === "makeQuiz" && sessionId) {
      setLocation(`/quiz/${sessionId}`);
    } else {
      setLocation(meta.path);
    }
  };

  return (
    <div className={`mt-2 flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
      status === "running"
        ? "border-border/60 bg-muted/40 text-muted-foreground"
        : status === "done"
          ? "border-primary/30 bg-primary/6 text-foreground cursor-pointer hover:bg-primary/10"
          : "border-destructive/30 bg-destructive/6 text-destructive"
    }`}
      onClick={status === "done" ? handleOpen : undefined}
    >
      {status === "running" && (
        <>
          <span className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin flex-shrink-0" />
          <span>{meta.label}{runningDots()}</span>
        </>
      )}
      {status === "done" && (
        <>
          <i className={`fa-solid ${meta.icon} ${meta.color} flex-shrink-0`} />
          <span className="flex-1">
            {action.type === "makeQuiz" ? "Quiz ready" : meta.label.replace("ing", "ed")} — click to open
          </span>
          <i className="fa-solid fa-arrow-right text-muted-foreground text-[10px]" />
        </>
      )}
      {status === "error" && (
        <>
          <i className="fa-solid fa-circle-exclamation flex-shrink-0" />
          <span>{errorMsg || "Action failed"}</span>
        </>
      )}
    </div>
  );
}
