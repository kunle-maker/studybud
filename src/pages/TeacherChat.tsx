import { useState, useRef, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LimitBanner from "@/components/LimitBanner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Emoji from "@/components/Emoji";

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
type HomeTab = "chats" | "past-questions" | "assignments";
type View = "home" | "chat";

interface StyleDef {
  key: TeachingStyle;
  label: string;
  faIcon: string;
  color: string;
  bg: string;
  desc: string;
  premiumOnly: boolean;
}

const STYLES: StyleDef[] = [
  { key: "default",     label: "Classic",    faIcon: "fa-book-open",    color: "text-blue-400",   bg: "bg-blue-400/15",   desc: "Friendly and patient",   premiumOnly: false },
  { key: "cool",        label: "Chill",      faIcon: "fa-glasses",      color: "text-sky-400",    bg: "bg-sky-400/15",    desc: "Relaxed, no stress",     premiumOnly: true  },
  { key: "concise",     label: "No Fluff",   faIcon: "fa-bolt",         color: "text-yellow-400", bg: "bg-yellow-400/15", desc: "Short, direct answers",  premiumOnly: true  },
  { key: "playful",     label: "Gen Z Mode", faIcon: "fa-fire",         color: "text-orange-400", bg: "bg-orange-400/15", desc: "Slay, fr fr, no cap",    premiumOnly: true  },
  { key: "controlling", label: "Strict",     faIcon: "fa-crosshairs",   color: "text-red-400",    bg: "bg-red-400/15",    desc: "Holds you accountable",  premiumOnly: true  },
  { key: "detailed",    label: "Deep Dive",  faIcon: "fa-microscope",   color: "text-violet-400", bg: "bg-violet-400/15", desc: "Thorough & in-depth",    premiumOnly: true  },
];

const HOME_TABS: { key: HomeTab; label: string; icon: string; premiumOnly: boolean }[] = [
  { key: "chats",          label: "Chats",         icon: "fa-clock-rotate-left", premiumOnly: false },
  { key: "past-questions", label: "Past Questions", icon: "fa-magnifying-glass",  premiumOnly: true  },
  { key: "assignments",    label: "Assignments",    icon: "fa-clipboard-list",    premiumOnly: true  },
];

export default function TeacherChat() {
  const { user } = useAuth();
  const isPremium = user?.role === "premium";

  const [view,           setView]           = useState<View>("home");
  const [homeTab,        setHomeTab]        = useState<HomeTab>("chats");
  const [chats,          setChats]          = useState<ChatSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState("");
  const [chatId,         setChatId]         = useState<string | null>(null);
  const [chatTitle,      setChatTitle]      = useState("New Chat");
  const [style,          setStyle]          = useState<TeachingStyle>("default");
  const [loading,        setLoading]        = useState(false);
  const [limitReached,   setLimitReached]   = useState(false);
  const [error,          setError]          = useState("");
  const [examPrepMode,   setExamPrepMode]   = useState(false);
  const [showStylePicker,setShowStylePicker]= useState(false);
  const [deleting,       setDeleting]       = useState<string | null>(null);

  const [pastQTopic,    setPastQTopic]    = useState("");
  const [pastQLoading,  setPastQLoading]  = useState(false);
  const [pastQResult,   setPastQResult]   = useState<string | null>(null);

  const [assignTopic,   setAssignTopic]   = useState("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignResult,  setAssignResult]  = useState<string | null>(null);
  const [chatAssignment,setChatAssignment]= useState<string | null>(null);
  const [chatAssignLoad,setChatAssignLoad]= useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/teacher/history");
      setChats(data.data || []);
    } catch { setChats([]); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const openNewChat = () => {
    setMessages([]); setChatId(null); setChatTitle("New Chat");
    setError(""); setLimitReached(false); setChatAssignment(null);
    setExamPrepMode(false); setStyle("default"); setShowStylePicker(true);
    setView("chat");
  };

  const openExistingChat = async (c: ChatSummary) => {
    try {
      const { data } = await api.get(`/teacher/chats/${c._id}`);
      const chat = data.data;
      setMessages(chat.messages.map((m: any) => ({ role: m.role, content: m.content })));
      setChatId(chat._id);
      setChatTitle(chat.title || c.title);
      setStyle(chat.teachingStyle || "default");
      setShowStylePicker(false);
      setChatAssignment(null);
      setError(""); setLimitReached(false);
      setView("chat");
    } catch { setError("Failed to load chat."); }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await api.delete(`/teacher/chats/${id}`);
      setChats(prev => prev.filter(c => c._id !== id));
    } catch { } finally { setDeleting(null); }
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
    } finally { setLoading(false); }
  };

  const handleChatAssignment = async () => {
    if (!isPremium || !chatId) return;
    setChatAssignLoad(true); setChatAssignment(null);
    try {
      const { data } = await api.post("/teacher/assignment", {
        chatId, topic: chatTitle !== "New Chat" ? chatTitle : undefined,
      });
      setChatAssignment(data.data.assignment);
    } catch { setError("Failed to generate assignment."); }
    finally { setChatAssignLoad(false); }
  };

  const handlePastQuestions = async () => {
    if (!isPremium || !pastQTopic.trim()) return;
    setPastQLoading(true); setPastQResult(null);
    try {
      const { data } = await api.post("/teacher/past-questions", { topic: pastQTopic });
      setPastQResult(data.data.questions);
    } catch (err: any) { setError(err?.response?.data?.message || "Search failed."); }
    finally { setPastQLoading(false); }
  };

  const handleStandaloneAssignment = async () => {
    if (!isPremium || !assignTopic.trim()) return;
    setAssignLoading(true); setAssignResult(null);
    try {
      const { data } = await api.post("/teacher/assignment", { topic: assignTopic });
      setAssignResult(data.data.assignment);
    } catch { setError("Failed to generate assignment."); }
    finally { setAssignLoading(false); }
  };

  const exportAsPDF = () => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const styleInfo = STYLES.find(s => s.key === style)!;
    const rows = messages.map(m => `
      <div class="msg ${m.role}">
        <div class="label">${m.role === "user" ? "You" : "TeachBuddy"}</div>
        <div class="content">${m.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>
      </div>`).join("");
    pw.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>${chatTitle} — TeachBuddy</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Georgia', serif; max-width: 680px; margin: 48px auto; color: #1a1a1a; line-height: 1.6; padding: 0 24px; }
        h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
        .meta { font-size: 12px; color: #666; margin-bottom: 36px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; }
        .msg { margin: 24px 0; }
        .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
        .user .label { color: #2563eb; }
        .assistant .label { color: #7c3aed; }
        .content { font-size: 14px; line-height: 1.75; white-space: pre-wrap; word-wrap: break-word; }
        .user .content { background: #f0f4ff; padding: 12px 16px; border-radius: 8px; }
        .assistant .content { color: #111; }
        @media print { body { margin: 0; } }
      </style>
    </head><body>
      <h1>${chatTitle}</h1>
      <div class="meta">TeachBuddy · ${styleInfo.label} style · Exported ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</div>
      ${rows}
    </body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 400);
  };

  const styleInfo = STYLES.find(s => s.key === style)!;
  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  /* ─── HOME VIEW ────────────────────────────────────────────────────────── */
  if (view === "home") {
    return (
      <div className="max-w-3xl space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">TeachBuddy</h1>
            <p className="text-muted-foreground text-sm mt-1">Your personal AI tutor — ask anything, study smarter.</p>
          </div>
          <button
            onClick={openNewChat}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 flex-shrink-0"
            style={{ background: "hsl(217 91% 48%)" }}
          >
            <i className="fa-solid fa-plus" />New Chat
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl border border-border">
          {HOME_TABS.map(tab => {
            const locked = tab.premiumOnly && !isPremium;
            const active = homeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => !locked && setHomeTab(tab.key)}
                disabled={locked}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : locked
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <i className={`fa-solid ${tab.icon} text-xs`} />
                <span className="hidden sm:inline">{tab.label}</span>
                {locked && (
                  <i className="fa-solid fa-lock text-xs absolute top-1.5 right-1.5 text-muted-foreground/30" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Chats ─────────────────────────────────────────────── */}
        {homeTab === "chats" && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-muted-foreground text-sm" />
              <h2 className="text-sm font-semibold text-foreground">Recent Chats</h2>
              {chats.length > 0 && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {chats.length} conversation{chats.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-14">
                <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <i className="fa-solid fa-chalkboard-user text-primary text-lg" />
                </div>
                <p className="text-sm font-semibold text-foreground">No chats yet</p>
                <p className="text-xs text-muted-foreground mt-1">Hit <strong>New Chat</strong> to start learning.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {chats.map(chat => {
                  const s = STYLES.find(x => x.key === chat.teachingStyle) || STYLES[0];
                  return (
                    <div
                      key={chat._id}
                      onClick={() => openExistingChat(chat)}
                      className="flex items-start gap-3 px-5 py-4 hover:bg-muted/30 cursor-pointer transition-colors group"
                    >
                      <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                        <i className={`fa-solid ${s.faIcon} ${s.color} text-sm`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">{chat.title}</p>
                          {s.key !== "default" && (
                            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md hidden sm:inline flex-shrink-0">
                              {s.label}
                            </span>
                          )}
                        </div>
                        {chat.preview && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.preview}</p>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {chat.messageCount} message{chat.messageCount !== 1 ? "s" : ""} · {timeAgo(chat.updatedAt)}
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
        )}

        {/* ── Tab: Past Questions ─────────────────────────────────────── */}
        {homeTab === "past-questions" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-magnifying-glass text-primary text-sm" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Past Questions Search</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Exam-style questions with full answers for any topic</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pastQTopic}
                    onChange={e => setPastQTopic(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handlePastQuestions()}
                    placeholder="e.g. WAEC Biology — Genetics, JAMB Chemistry, A-Level Maths…"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                  <button
                    onClick={handlePastQuestions}
                    disabled={pastQLoading || !pastQTopic.trim()}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all flex-shrink-0"
                    style={{ background: "hsl(217 91% 48%)" }}
                  >
                    {pastQLoading
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <i className="fa-solid fa-search" />}
                  </button>
                </div>
                {!pastQTopic && !pastQResult && (
                  <div className="flex flex-wrap gap-2">
                    {["WAEC Biology", "JAMB Physics", "NECO Chemistry", "A-Level Economics"].map(s => (
                      <button key={s} onClick={() => setPastQTopic(s)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {pastQResult && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Emoji char="🎯" size={16} />
                    <h3 className="text-sm font-semibold text-foreground">Past Questions: {pastQTopic}</h3>
                  </div>
                  <button onClick={() => setPastQResult(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                    <i className="fa-solid fa-xmark text-xs" />
                  </button>
                </div>
                <div className="p-5 max-h-[70vh] overflow-y-auto">
                  <MarkdownRenderer content={pastQResult} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Assignments ────────────────────────────────────────── */}
        {homeTab === "assignments" && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-clipboard-list text-primary text-sm" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">AI Assignment Generator</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Generate a full assignment with questions on any topic</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assignTopic}
                    onChange={e => setAssignTopic(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleStandaloneAssignment()}
                    placeholder="e.g. Newton's Laws of Motion, Photosynthesis, World War II…"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                  <button
                    onClick={handleStandaloneAssignment}
                    disabled={assignLoading || !assignTopic.trim()}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all flex-shrink-0"
                    style={{ background: "hsl(217 91% 48%)" }}
                  >
                    {assignLoading
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <i className="fa-solid fa-wand-magic-sparkles" />}
                  </button>
                </div>
                {!assignTopic && !assignResult && (
                  <div className="flex flex-wrap gap-2">
                    {["Photosynthesis", "Newton's Laws", "The French Revolution", "Cell Division"].map(s => (
                      <button key={s} onClick={() => setAssignTopic(s)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {assignResult && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Emoji char="📝" size={16} />
                    <h3 className="text-sm font-semibold text-foreground">Assignment: {assignTopic}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const pw = window.open("", "_blank");
                        if (!pw) return;
                        pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${assignTopic} — Assignment</title>
                          <style>body{font-family:Georgia,serif;max-width:680px;margin:48px auto;color:#1a1a1a;line-height:1.7;padding:0 24px}h1{font-size:20px;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:24px}</style>
                          </head><body><h1>Assignment: ${assignTopic}</h1>${assignResult.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")}</body></html>`);
                        pw.document.close(); setTimeout(() => pw.print(), 400);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                      <i className="fa-solid fa-file-pdf text-xs" />Export PDF
                    </button>
                    <button onClick={() => setAssignResult(null)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  </div>
                </div>
                <div className="p-5 max-h-[70vh] overflow-y-auto">
                  <MarkdownRenderer content={assignResult} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  /* ─── CHAT VIEW ────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-3xl flex flex-col h-[calc(100vh-8rem)]">

      {/* Header */}
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
            <div className="flex items-center gap-1.5">
              <i className={`fa-solid ${styleInfo.faIcon} ${styleInfo.color} text-xs`} />
              <p className="text-xs text-muted-foreground">{styleInfo.label}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isPremium && chatId && (
            <button
              onClick={handleChatAssignment}
              disabled={chatAssignLoad}
              title="Generate assignment from this chat"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
            >
              {chatAssignLoad
                ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                : <i className="fa-solid fa-clipboard-list" />}
              <span className="hidden sm:inline">Assignment</span>
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={exportAsPDF}
              title="Export chat as PDF"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <i className="fa-solid fa-file-pdf" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          )}
          <button
            onClick={openNewChat}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <i className="fa-solid fa-plus" />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>

      {limitReached && <div className="mb-3"><LimitBanner feature="teacher questions" /></div>}

      {/* Style picker (new chat only) */}
      {showStylePicker && (
        <div className="mb-4 bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Choose a teaching style
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STYLES.map(s => {
              const locked = s.premiumOnly && !isPremium;
              const active = style === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => !locked && setStyle(s.key)}
                  disabled={locked}
                  className={`relative flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-all ${
                    active
                      ? "border-primary/60"
                      : locked
                        ? "border-border opacity-40 cursor-not-allowed"
                        : "border-border hover:border-primary/30 hover:bg-muted/40"
                  }`}
                  style={active ? { background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.5)" } : undefined}
                >
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                    <i className={`fa-solid ${s.faIcon} ${s.color} text-sm`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-tight">{s.label}</p>
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{s.desc}</p>
                  </div>
                  {locked && <i className="fa-solid fa-lock text-muted-foreground/50 text-xs absolute top-2 right-2" />}
                  {active && <i className="fa-solid fa-circle-check text-primary text-xs absolute top-2 right-2" />}
                </button>
              );
            })}
          </div>
          {!isPremium && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <i className="fa-solid fa-lock text-xs" />
              <a href="/premium" className="text-primary hover:underline">Upgrade to Premium</a> to unlock all 5 extra styles.
            </p>
          )}
        </div>
      )}

      {/* In-chat assignment */}
      {chatAssignment && (
        <div className="mb-4 bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-clipboard-list text-primary text-sm" />
              <h3 className="text-sm font-semibold text-foreground">Assignment from this chat</h3>
            </div>
            <button onClick={() => setChatAssignment(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
          <div className="p-5 max-h-64 overflow-y-auto text-sm">
            <MarkdownRenderer content={chatAssignment} />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className={`w-14 h-14 rounded-2xl ${styleInfo.bg} flex items-center justify-center mb-4`}>
                <i className={`fa-solid ${styleInfo.faIcon} ${styleInfo.color} text-2xl`} />
              </div>
              <p className="font-semibold text-foreground text-base">TeachBuddy is ready</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                {styleInfo.key === "playful"   ? "It's giving tutor energy — ask me anything, no cap fr fr"
                : styleInfo.key === "concise"  ? "Ask. I'll keep it short."
                : styleInfo.key === "controlling" ? "Ask your question. I'll make sure you actually understand it."
                : styleInfo.key === "detailed" ? "Ready to go deep — ask anything and I'll break it all down."
                : "Ask any study question — I remember the whole conversation."}
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {["Explain photosynthesis", "What is osmosis?", "How does DNA replication work?"].map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                msg.role === "user" ? "bg-primary" : styleInfo.bg
              }`}>
                {msg.role === "user"
                  ? <i className="fa-solid fa-user text-white text-xs" />
                  : <i className={`fa-solid ${styleInfo.faIcon} ${styleInfo.color} text-sm`} />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-white rounded-tr-sm whitespace-pre-wrap"
                  : "bg-muted text-foreground rounded-tl-sm"
              }`}>
                {msg.role === "assistant" ? <MarkdownRenderer content={msg.content} /> : msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className={`w-8 h-8 rounded-xl ${styleInfo.bg} flex items-center justify-center flex-shrink-0`}>
                <i className={`fa-solid ${styleInfo.faIcon} ${styleInfo.color} text-sm`} />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <i className="fa-solid fa-circle-exclamation" />{error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-border p-4 space-y-2.5">
          {isPremium && (
            <button
              onClick={() => setExamPrepMode(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                examPrepMode
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <i className="fa-solid fa-magnifying-glass text-xs" />
              Exam Prep {examPrepMode && "· ON"}
            </button>
          )}
          <form onSubmit={sendMessage} className="flex gap-2.5">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={examPrepMode ? "Ask about a topic for past questions context…" : "Ask your question…"}
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
          {!isPremium && (
            <p className="text-xs text-muted-foreground text-center">
              <i className="fa-solid fa-lock text-xs mr-1" />
              Free plan · 3 questions/day ·{" "}
              <a href="/premium" className="text-primary hover:underline">Upgrade for unlimited</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
