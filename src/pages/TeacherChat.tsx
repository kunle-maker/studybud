import { useState, useRef, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LimitBanner from "@/components/LimitBanner";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatSummary {
  _id: string;
  title: string;
  teachingStyle: string;
  updatedAt: string;
  messageCount: number;
  preview: string;
}

type TeachingStyle = "default" | "cool" | "concise" | "playful" | "controlling" | "detailed";

const STYLES: { key: TeachingStyle; label: string; emoji: string; desc: string; premiumOnly: boolean }[] = [
  { key: "default",     label: "Classic",      emoji: "📚", desc: "Friendly and patient",      premiumOnly: false },
  { key: "cool",        label: "Chill",         emoji: "😎", desc: "Relaxed, no stress",         premiumOnly: true },
  { key: "concise",     label: "No Fluff",      emoji: "⚡", desc: "Short, direct answers",      premiumOnly: true },
  { key: "playful",     label: "Gen Z Mode",    emoji: "🔥", desc: "Slay, fr fr, no cap",        premiumOnly: true },
  { key: "controlling", label: "Strict Mode",   emoji: "🎯", desc: "Holds you accountable",      premiumOnly: true },
  { key: "detailed",    label: "Deep Dive",     emoji: "🔬", desc: "Thorough & in-depth",        premiumOnly: true },
];

type View = "home" | "chat";

export default function TeacherChat() {
  const { user } = useAuth();
  const isPremium = user?.role === "premium";

  const [view,          setView]          = useState<View>("home");
  const [chats,         setChats]         = useState<ChatSummary[]>([]);
  const [historyLoading,setHistoryLoading]= useState(true);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [input,         setInput]         = useState("");
  const [chatId,        setChatId]        = useState<string | null>(null);
  const [chatTitle,     setChatTitle]     = useState("New Chat");
  const [style,         setStyle]         = useState<TeachingStyle>("default");
  const [loading,       setLoading]       = useState(false);
  const [limitReached,  setLimitReached]  = useState(false);
  const [error,         setError]         = useState("");
  const [examPrepMode,  setExamPrepMode]  = useState(false);
  const [showStylePicker,setShowStylePicker] = useState(false);
  const [assignment,    setAssignment]    = useState<string | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [pastQTopic,    setPastQTopic]    = useState("");
  const [showPastQ,     setShowPastQ]     = useState(false);
  const [pastQLoading,  setPastQLoading]  = useState(false);
  const [pastQResult,   setPastQResult]   = useState<string | null>(null);
  const [deleting,      setDeleting]      = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/teacher/history");
      setChats(data.data || []);
    } catch {
      setChats([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const openNewChat = () => {
    setMessages([]); setChatId(null); setChatTitle("New Chat");
    setError(""); setLimitReached(false); setAssignment(null);
    setPastQResult(null); setShowPastQ(false); setExamPrepMode(false);
    setStyle("default"); setShowStylePicker(true);
    setView("chat");
  };

  const openExistingChat = async (chatSummary: ChatSummary) => {
    try {
      const { data } = await api.get(`/teacher/chats/${chatSummary._id}`);
      const chat = data.data;
      setMessages(chat.messages.map((m: any) => ({ role: m.role, content: m.content })));
      setChatId(chat._id);
      setChatTitle(chat.title || chatSummary.title);
      setStyle(chat.teachingStyle || "default");
      setShowStylePicker(false);
      setAssignment(null); setPastQResult(null);
      setError(""); setLimitReached(false);
      setView("chat");
    } catch {
      setError("Failed to load chat.");
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await api.delete(`/teacher/chats/${id}`);
      setChats(prev => prev.filter(c => c._id !== id));
    } catch { } finally {
      setDeleting(null);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput(""); setError(""); setLimitReached(false); setShowStylePicker(false);
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const payload: any = { question, style, examPrepMode };
      if (chatId) payload.chatId = chatId;
      const { data } = await api.post("/teacher/ask", payload);
      const d = data.data;
      setChatId(d.chatId);
      if (d.title && !chatId) setChatTitle(d.title);
      setMessages(prev => [...prev, { role: "assistant", content: d.answer }]);
      loadHistory();
    } catch (err: any) {
      if (err?.response?.data?.limitReached) setLimitReached(true);
      else setError(err?.response?.data?.message || "Something went wrong.");
      setMessages(prev => prev.slice(0, -1));
      setInput(question);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAssignment = async () => {
    if (!isPremium) return;
    setAssignLoading(true); setAssignment(null);
    try {
      const { data } = await api.post("/teacher/assignment", {
        chatId,
        topic: chatTitle !== "New Chat" ? chatTitle : undefined
      });
      setAssignment(data.data.assignment);
    } catch {
      setError("Failed to generate assignment.");
    } finally {
      setAssignLoading(false);
    }
  };

  const handlePastQuestions = async () => {
    if (!isPremium || !pastQTopic.trim()) return;
    setPastQLoading(true); setPastQResult(null);
    try {
      const { data } = await api.post("/teacher/past-questions", { topic: pastQTopic });
      setPastQResult(data.data.questions);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Search failed.");
    } finally {
      setPastQLoading(false);
    }
  };

  const styleInfo = STYLES.find(s => s.key === style);
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (view === "home") {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">TeachBuddy</h1>
            <p className="text-muted-foreground text-sm mt-1">Your AI tutor — pick up where you left off or start fresh.</p>
          </div>
          <button
            onClick={openNewChat}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 flex-shrink-0"
            style={{ background: "hsl(217 91% 48%)" }}
          >
            <i className="fa-solid fa-plus" />New Chat
          </button>
        </div>

        {isPremium && (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <i className="fa-solid fa-magnifying-glass text-primary text-sm" />
              <h2 className="text-sm font-semibold text-foreground">Past Questions — Exam Prep</h2>
              <span className="text-xs font-semibold text-amber-300 px-2 py-0.5 rounded-full"
                style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)" }}>
                <i className="fa-solid fa-crown mr-1" />Premium
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Enter a topic or subject and TeachBuddy will find and generate past exam-style questions with answers.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={pastQTopic}
                onChange={e => setPastQTopic(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handlePastQuestions()}
                placeholder="e.g. WAEC Biology — Genetics, A-Level Economics…"
                className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <button
                onClick={handlePastQuestions}
                disabled={pastQLoading || !pastQTopic.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: "hsl(217 91% 48%)" }}
              >
                {pastQLoading
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <i className="fa-solid fa-search" />}
              </button>
            </div>
            {pastQResult && (
              <div className="bg-muted rounded-xl p-4 max-h-96 overflow-y-auto text-sm">
                <MarkdownRenderer content={pastQResult} />
              </div>
            )}
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <i className="fa-solid fa-clock-rotate-left text-muted-foreground text-sm" />
            <h2 className="text-sm font-semibold text-foreground">Recent Chats</h2>
            {chats.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">{chats.length} conversation{chats.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-chalkboard-user text-primary text-lg" />
              </div>
              <p className="text-sm font-medium text-foreground">No chats yet</p>
              <p className="text-xs mt-1">Hit <strong>New Chat</strong> to start learning.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {chats.map(chat => {
                const s = STYLES.find(x => x.key === chat.teachingStyle);
                return (
                  <div
                    key={chat._id}
                    onClick={() => openExistingChat(chat)}
                    className="flex items-start gap-3 px-5 py-4 hover:bg-muted/40 cursor-pointer transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-base">
                      {s?.emoji || "📚"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{chat.title}</p>
                        {s && s.key !== "default" && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md hidden sm:inline">
                            {s.label}
                          </span>
                        )}
                      </div>
                      {chat.preview && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.preview}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {chat.messageCount} messages · {timeAgo(chat.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={e => handleDeleteChat(chat._id, e)}
                      disabled={deleting === chat._id}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      {deleting === chat._id
                        ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                        : <i className="fa-solid fa-trash text-xs" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => { setView("home"); loadHistory(); }}
            className="flex-shrink-0 w-8 h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <i className="fa-solid fa-arrow-left text-xs" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">{chatTitle}</h1>
            {styleInfo && (
              <p className="text-xs text-muted-foreground">{styleInfo.emoji} {styleInfo.label}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPremium && chatId && (
            <button
              onClick={handleGenerateAssignment}
              disabled={assignLoading}
              title="Generate Assignment"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
            >
              {assignLoading
                ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                : <i className="fa-solid fa-clipboard-list" />}
              <span className="hidden sm:inline">Assignment</span>
            </button>
          )}
          <button
            onClick={openNewChat}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <i className="fa-solid fa-plus" /><span className="hidden sm:inline">New chat</span>
          </button>
        </div>
      </div>

      {limitReached && <div className="mb-4"><LimitBanner feature="teacher questions" /></div>}

      {showStylePicker && (
        <div className="mb-4 bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Choose a teaching style
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STYLES.map(s => {
              const locked = s.premiumOnly && !isPremium;
              return (
                <button
                  key={s.key}
                  onClick={() => !locked && setStyle(s.key)}
                  disabled={locked}
                  className={`relative flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    style === s.key
                      ? "border-primary bg-primary/10"
                      : locked
                        ? "border-border opacity-50 cursor-not-allowed"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-base">{s.emoji}</span>
                  <span className="text-xs font-semibold text-foreground">{s.label}</span>
                  <span className="text-xs text-muted-foreground leading-tight">{s.desc}</span>
                  {locked && (
                    <span className="absolute top-1.5 right-1.5 text-xs">
                      <i className="fa-solid fa-lock text-muted-foreground/60 text-xs" />
                    </span>
                  )}
                  {style === s.key && (
                    <span className="absolute top-1.5 right-1.5">
                      <i className="fa-solid fa-circle-check text-primary text-xs" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {!isPremium && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <i className="fa-solid fa-lock text-xs" />
              Upgrade to Premium to unlock all teaching styles.
            </p>
          )}
        </div>
      )}

      {assignment && (
        <div className="mb-4 bg-card border border-border rounded-2xl p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-clipboard-list text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Your Assignment</h3>
            </div>
            <button onClick={() => setAssignment(null)} className="text-muted-foreground hover:text-foreground transition-colors">
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
          <div className="text-sm max-h-64 overflow-y-auto">
            <MarkdownRenderer content={assignment} />
          </div>
        </div>
      )}

      <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">{styleInfo?.emoji || "📚"}</span>
              </div>
              <p className="font-semibold text-foreground text-base">TeachBuddy is ready</p>
              <p className="text-sm mt-2 max-w-sm">
                {styleInfo?.key === "playful"
                  ? "It's giving tutor energy ✨ Ask me anything, no cap fr fr"
                  : styleInfo?.key === "concise"
                    ? "Ask. I'll keep it short."
                    : styleInfo?.key === "controlling"
                      ? "Ask your question. I'll make sure you actually understand it."
                      : "Ask any study question — I remember the whole conversation."}
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {["Explain photosynthesis", "What is osmosis?", "How does DNA replication work?"].map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/70 border border-accent-foreground/10 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-sm ${
                msg.role === "user" ? "bg-primary text-white" : ""
              }`}
              style={msg.role === "assistant"
                ? { background: "rgba(167,139,250,0.2)", color: "rgb(196,181,253)" }
                : undefined}>
                {msg.role === "user"
                  ? <i className="fa-solid fa-user text-xs" />
                  : styleInfo?.emoji || "📚"}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-tr-sm whitespace-pre-wrap"
                  : "bg-muted text-foreground rounded-tl-sm"
              }`}>
                {msg.role === "assistant"
                  ? <MarkdownRenderer content={msg.content} />
                  : msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
                style={{ background: "rgba(167,139,250,0.2)", color: "rgb(196,181,253)" }}>
                {styleInfo?.emoji || "📚"}
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation" />{error}</p>}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-4 space-y-2">
          {isPremium && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExamPrepMode(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  examPrepMode
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/70"
                }`}
              >
                <i className="fa-solid fa-magnifying-glass text-xs" />
                Exam Prep Mode {examPrepMode && "ON"}
              </button>
              {examPrepMode && (
                <p className="text-xs text-muted-foreground">TeachBuddy will search for relevant past questions context.</p>
              )}
            </div>
          )}
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={examPrepMode ? "Ask about a topic for past questions…" : "Ask your question…"}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex-shrink-0"
              style={{ background: "hsl(217 91% 48%)" }}
            >
              <i className="fa-solid fa-paper-plane" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
