import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { SUBJECT_CATEGORIES, type SubjectCategory } from "@/data/subjects";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LimitBanner from "@/components/LimitBanner";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AIActionCards from "@/components/AIActionCards";
import AgenticStep from "@/components/AgenticStep";

interface AgentAction { type: string; params?: Record<string, string>; }

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: AgentAction | null;
}

interface ChatSummary {
  _id: string; title: string; subject: string; branch: string;
  updatedAt: string; messageCount: number; preview: string;
}

type View = "categories" | "branches" | "chat" | "history";

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Intro",        color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25" },
  1: { label: "Beginner",     color: "text-blue-400 bg-blue-400/10 border-blue-400/25" },
  2: { label: "Intermediate", color: "text-amber-400 bg-amber-400/10 border-amber-400/25" },
  3: { label: "Advanced",     color: "text-red-400 bg-red-400/10 border-red-400/25" },
};

function getDifficultyForBranch(index: number) {
  if (index === 0) return DIFFICULTY_LABELS[0];
  if (index <= 3)  return DIFFICULTY_LABELS[1];
  if (index <= 7)  return DIFFICULTY_LABELS[2];
  return DIFFICULTY_LABELS[3];
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Subjects() {
  const { user }  = useAuth();
  const isPremium = user?.role === "premium";
  const params    = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();

  const [view,         setView]         = useState<View>("categories");
  const [category,     setCategory]     = useState<SubjectCategory | null>(null);
  const [branch,       setBranch]       = useState("");
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState("");
  const [chatId,       setChatId]       = useState<string | null>(null);
  const [chatTitle,    setChatTitle]    = useState("");
  const [loading,      setLoading]      = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [error,        setError]        = useState("");
  const [history,      setHistory]      = useState<ChatSummary[]>([]);
  const [histLoading,  setHistLoading]  = useState(false);
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState("");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [initialised,  setInitialised]  = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const { data } = await api.get("/subjects/history");
      setHistory(data.data || []);
    } catch { setHistory([]); }
    finally { setHistLoading(false); }
  }, []);

  /* ── Deep-link from /chat/subject/:id ─────────────────────────────── */
  useEffect(() => {
    if (!params?.id || initialised) return;
    setInitialised(true);
    api.get(`/subjects/chats/${params.id}`)
      .then(({ data }) => {
        const chat = data.data;
        const cat  = SUBJECT_CATEGORIES.find(x => x.key === chat.subject) || SUBJECT_CATEGORIES[0];
        setCategory(cat);
        setBranch(chat.branch || "");
        setChatId(chat._id);
        setChatTitle(chat.title || chat.branch);
        setMessages(chat.messages.map((m: any) => ({ role: m.role, content: m.content })));
        setView("chat");
      })
      .catch(() => { /* fallback to categories */ });
  }, [params?.id, initialised]);

  /* Sync URL when chatId changes */
  useEffect(() => {
    if (!chatId || view !== "chat") return;
    const target = `/chat/subject/${chatId}`;
    if (!window.location.pathname.endsWith(chatId)) {
      setLocation(target, { replace: true });
    }
  }, [chatId, view, setLocation]);

  const openBranches = (cat: SubjectCategory) => {
    setCategory(cat); setBranchSearch(""); setView("branches");
  };

  const openChat = (cat: SubjectCategory, br: string, existingChat?: ChatSummary) => {
    setCategory(cat); setBranch(br);
    setMessages([]); setChatId(existingChat?._id || null);
    setChatTitle(existingChat?.title || br);
    setError(""); setLimitReached(false); setInput("");
    setView("chat");
    if (!existingChat) setLocation("/subjects", { replace: true });
  };

  const openHistoryChat = async (c: ChatSummary) => {
    const cat = SUBJECT_CATEGORIES.find(x => x.key === c.subject) || SUBJECT_CATEGORIES[0];
    try {
      const { data } = await api.get(`/subjects/chats/${c._id}`);
      const chat = data.data;
      setCategory(cat); setBranch(c.branch);
      setChatId(chat._id); setChatTitle(chat.title || c.title);
      setMessages(chat.messages.map((m: any) => ({ role: m.role, content: m.content })));
      setError(""); setLimitReached(false); setInput("");
      setView("chat"); setSidebarOpen(false);
    } catch { setError("Failed to load chat."); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await api.delete(`/subjects/chats/${id}`);
      setHistory(prev => prev.filter(c => c._id !== id));
    } catch { } finally { setDeleting(null); }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !category) return;
    const question = input.trim();
    setInput(""); setError(""); setLimitReached(false);
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);
    try {
      const payload: any = { question, subject: category.key, branch, context: [] };
      if (chatId) payload.chatId = chatId;
      const { data } = await api.post("/subjects/ask", payload);
      const d = data.data;
      setChatId(d.chatId);
      if (!chatId) setChatTitle(d.title);
      setMessages(prev => [...prev, { role: "assistant", content: d.answer, action: d.action || null }]);
    } catch (err: any) {
      if (err?.response?.data?.limitReached) setLimitReached(true);
      else setError(err?.response?.data?.message || "Something went wrong.");
      setMessages(prev => prev.slice(0, -1));
      setInput(question);
    } finally { setLoading(false); }
  };

  const exportPDF = () => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const rows = messages.map(m => `
      <div class="msg ${m.role}"><div class="label">${m.role === "user" ? "You" : `${branch} Tutor`}</div>
      <div class="content">${m.content.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")}</div></div>`).join("");
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${chatTitle}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;max-width:680px;margin:48px auto;color:#1a1a1a;line-height:1.6;padding:0 24px}
      h1{font-size:20px;font-weight:700}.meta{font-size:12px;color:#666;margin-bottom:32px;border-bottom:1px solid #e5e7eb;padding-bottom:14px}
      .msg{margin:22px 0}.label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px}
      .user .label{color:#2563eb}.assistant .label{color:#7c3aed}
      .content{font-size:14px;line-height:1.75;white-space:pre-wrap;word-wrap:break-word}
      .user .content{background:#f0f4ff;padding:10px 14px;border-radius:8px}@media print{body{margin:0}}</style>
      </head><body><h1>${chatTitle}</h1>
      <div class="meta">${branch} · ${category?.label} · ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div>
      ${rows}</body></html>`);
    pw.document.close(); setTimeout(() => pw.print(), 400);
  };

  /* ── Context material for agentic steps ─────────────────────────────── */
  const getContextMaterial = () =>
    messages.map(m => m.content).join("\n\n").slice(0, 4000);

  /* ── Categories ──────────────────────────────────────────────────────── */
  if (view === "categories") {
    return (
      <div className="max-w-5xl space-y-6 sm:space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Subject Hub</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">Choose a subject and study with a specialist AI tutor.</p>
          </div>
          <button onClick={() => { loadHistory(); setView("history"); }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border border-border bg-card text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <i className="fa-solid fa-clock-rotate-left text-xs" />Study History
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {SUBJECT_CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => openBranches(cat)}
              className="bg-card border border-border rounded-2xl p-3 sm:p-5 text-left hover:shadow-md hover:-translate-y-0.5 hover:border-border/80 transition-all group flex flex-col gap-3 sm:gap-4">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${cat.bg} flex items-center justify-center border ${cat.border}`}>
                <i className={`fa-solid ${cat.icon} ${cat.color} text-xs sm:text-sm`} />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{cat.label}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-snug hidden sm:block">{cat.desc}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground/50 pt-0.5">{cat.branches.length} topics</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ── Branches ────────────────────────────────────────────────────────── */
  if (view === "branches" && category) {
    const filtered = category.branches.filter(b => b.toLowerCase().includes(branchSearch.toLowerCase()));
    return (
      <div className="max-w-3xl space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("categories")}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex-shrink-0">
            <i className="fa-solid fa-arrow-left text-xs" />
          </button>
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${category.bg} border ${category.border} flex items-center justify-center flex-shrink-0`}>
            <i className={`fa-solid ${category.icon} ${category.color} text-xs sm:text-sm`} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">{category.label}</h1>
            <p className="text-xs text-muted-foreground">Select a topic to start studying</p>
          </div>
        </div>

        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
          <input type="text" value={branchSearch} onChange={e => setBranchSearch(e.target.value)}
            placeholder="Search topics…"
            className="w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {filtered.map((br, i) => {
            const diff = getDifficultyForBranch(i);
            const isGeneral = br.startsWith("Normal ");
            return (
              <button key={br} onClick={() => openChat(category, br)}
                className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 text-left hover:bg-muted/30 transition-colors group">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isGeneral ? `${category.bg} border ${category.border}` : "bg-muted/50"
                }`}>
                  {isGeneral
                    ? <i className={`fa-solid ${category.icon} ${category.color} text-xs`} />
                    : <span className={`text-xs font-bold ${category.color}`}>{i}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs sm:text-sm font-medium truncate ${isGeneral ? "font-semibold text-foreground" : "text-foreground"}`}>{br}</p>
                  {isGeneral && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">General {category.label} tutor</p>}
                </div>
                <span className={`text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded border ${diff.color} flex-shrink-0`}>{diff.label}</span>
                <i className="fa-solid fa-chevron-right text-muted-foreground/40 text-xs flex-shrink-0" />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-10 sm:py-12 text-center text-muted-foreground text-sm">
              No topics match "<strong>{branchSearch}</strong>"
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── History ─────────────────────────────────────────────────────────── */
  if (view === "history") {
    return (
      <div className="max-w-3xl space-y-4 sm:space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("categories")}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <i className="fa-solid fa-arrow-left text-xs" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Study History</h1>
            <p className="text-xs text-muted-foreground">All your past subject chats</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {histLoading ? (
            <div className="flex items-center justify-center py-14 sm:py-16">
              <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-14 sm:py-16">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-book-open text-muted-foreground text-base sm:text-lg" />
              </div>
              <p className="text-sm font-semibold text-foreground">No subject chats yet</p>
              <p className="text-xs text-muted-foreground mt-1">Pick a subject above to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.map(c => {
                const cat = SUBJECT_CATEGORIES.find(x => x.key === c.subject);
                return (
                  <div key={c._id} onClick={() => openHistoryChat(c)}
                    className="flex items-start gap-3 px-4 sm:px-5 py-3.5 sm:py-4 hover:bg-muted/30 cursor-pointer transition-colors group">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cat?.bg || "bg-muted"}`}>
                      <i className={`fa-solid ${cat?.icon || "fa-book"} ${cat?.color || "text-muted-foreground"} text-xs sm:text-sm`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{c.branch}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{c.preview || c.title}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-1">{c.messageCount} messages · {timeAgo(c.updatedAt)}</p>
                    </div>
                    <button onClick={e => handleDelete(c._id, e)} disabled={deleting === c._id}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                      {deleting === c._id
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

  /* ── Chat ────────────────────────────────────────────────────────────── */
  if (!category) return null;

  const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";

  return (
    <div className="flex h-[calc(100vh-7rem)] sm:h-[calc(100vh-8rem)] max-w-6xl gap-0 overflow-hidden rounded-2xl border border-border bg-card">

      {/* Sidebar */}
      <div className={`flex-shrink-0 border-r border-border bg-background flex flex-col transition-all duration-200 ${
        sidebarOpen ? "w-56 sm:w-64" : "w-0 overflow-hidden"
      } md:w-52 md:overflow-visible`}>
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">History</span>
          <button onClick={loadHistory}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <i className="fa-solid fa-rotate text-[10px]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {histLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 px-4">No history yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {history.map(c => {
                const cat = SUBJECT_CATEGORIES.find(x => x.key === c.subject);
                return (
                  <button key={c._id} onClick={() => openHistoryChat(c)}
                    className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-muted/40 transition-colors ${c._id === chatId ? "bg-primary/5" : ""}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <i className={`fa-solid ${cat?.icon || "fa-book"} ${cat?.color || "text-muted-foreground"} text-xs`} />
                      <p className="text-xs font-semibold text-foreground truncate">{c.branch}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{timeAgo(c.updatedAt)}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => { loadHistory(); setSidebarOpen(p => !p); }}
              className="md:hidden w-7 h-7 sm:w-8 sm:h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex-shrink-0">
              <i className="fa-solid fa-sidebar text-xs" />
            </button>
            <button onClick={() => setView("branches")}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex-shrink-0">
              <i className="fa-solid fa-arrow-left text-xs" />
            </button>
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${category.bg} flex items-center justify-center flex-shrink-0`}>
              <i className={`fa-solid ${category.icon} ${category.color} text-xs`} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">{branch}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{category.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {messages.length > 0 && (
              <button onClick={exportPDF}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                <i className="fa-solid fa-file-pdf" /><span className="hidden sm:inline">Export</span>
              </button>
            )}
            <button onClick={() => openChat(category, branch)}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              <i className="fa-solid fa-plus" /><span className="hidden sm:inline">New</span>
            </button>
          </div>
        </div>

        {limitReached && (
          <div className="px-3 sm:px-5 pt-3 flex-shrink-0">
            <LimitBanner feature="subject questions" />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 sm:py-5 space-y-3 sm:space-y-5">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-8 sm:py-10">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${category.bg} border ${category.border} flex items-center justify-center mb-3 sm:mb-4`}>
                <i className={`fa-solid ${category.icon} ${category.color} text-lg sm:text-xl`} />
              </div>
              <p className="font-semibold text-foreground text-sm sm:text-base">{branch} Tutor</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 max-w-sm leading-relaxed">
                Ask any question about <strong>{branch}</strong> and I'll explain it clearly.
              </p>
              <div className="flex flex-wrap gap-2 mt-4 sm:mt-6 justify-center">
                {[`What is ${branch}?`, `Explain the basics of ${branch}`, `Key concepts in ${branch}`].map(q => (
                  <button key={q} onClick={() => setInput(q)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border transition-colors max-w-[200px] truncate">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const precedingUserMsg = !isUser && i > 0 ? messages[i - 1] : null;
            const showActionCards  = !isUser && !msg.action && precedingUserMsg?.role === "user";

            return (
              <div key={i} className="space-y-2">
                <div className={`flex gap-2.5 sm:gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isUser ? "bg-primary" : `${category.bg} border ${category.border}`
                  }`}>
                    {isUser
                      ? <i className="fa-solid fa-user text-white text-xs" />
                      : <i className={`fa-solid ${category.icon} ${category.color} text-xs`} />}
                  </div>
                  <div className={`max-w-[80%] sm:max-w-[78%] px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-primary text-white rounded-tr-sm whitespace-pre-wrap"
                      : "bg-card border border-border/60 text-foreground rounded-tl-sm shadow-sm"
                  }`}>
                    {isUser
                      ? msg.content
                      : <MarkdownRenderer content={msg.content} />}
                  </div>
                </div>

                {/* Agentic step */}
                {msg.action && !isUser && (
                  <div className="ml-9 sm:ml-11">
                    <AgenticStep action={msg.action} contextMaterial={getContextMaterial()} />
                  </div>
                )}

                {/* Contextual action cards */}
                {showActionCards && (
                  <div className="ml-9 sm:ml-11">
                    <AIActionCards
                      userMessage={precedingUserMsg!.content}
                      context={{ subject: category?.label, topic: branch }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-2.5 sm:gap-3">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${category.bg} border ${category.border} flex items-center justify-center flex-shrink-0`}>
                <i className={`fa-solid ${category.icon} ${category.color} text-xs`} />
              </div>
              <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs sm:text-sm text-destructive flex items-center gap-1.5">
              <i className="fa-solid fa-circle-exclamation" />{error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border px-3 sm:px-5 py-3 sm:py-4 flex-shrink-0">
          <form onSubmit={sendMessage} className="flex gap-2 sm:gap-2.5">
            <input
              type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder={`Ask about ${branch}…`} disabled={loading}
              className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-input bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 flex-shrink-0">
              {loading
                ? <span className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <i className="fa-solid fa-paper-plane text-xs" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
          {!isPremium && (
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-2">
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
