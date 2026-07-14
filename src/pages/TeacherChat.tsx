import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import AIActionCards from "@/components/AIActionCards";
import AgenticStep from "@/components/AgenticStep";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface AgentAction {
  type: string;
  params?: Record<string, string>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  action?: AgentAction | null;
  /** Accumulated raw content including ACTION block (stripped on done) */
  _raw?: string;
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

interface StyleDef {
  key: TeachingStyle;
  label: string;
  faIcon: string;
  color: string;
  bg: string;
  desc: string;
  premiumOnly: boolean;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const STYLES: StyleDef[] = [
  { key: "default",     label: "Classic",    faIcon: "fa-book-open",  color: "text-blue-400",   bg: "bg-blue-400/15",   desc: "Friendly and patient",  premiumOnly: false },
  { key: "cool",        label: "Chill",      faIcon: "fa-glasses",    color: "text-sky-400",    bg: "bg-sky-400/15",    desc: "Relaxed, no stress",    premiumOnly: true  },
  { key: "concise",     label: "No Fluff",   faIcon: "fa-bolt",       color: "text-yellow-400", bg: "bg-yellow-400/15", desc: "Short, direct answers", premiumOnly: true  },
  { key: "playful",     label: "Gen Z Mode", faIcon: "fa-fire",       color: "text-orange-400", bg: "bg-orange-400/15", desc: "Slay, fr fr, no cap",   premiumOnly: true  },
  { key: "controlling", label: "Strict",     faIcon: "fa-crosshairs", color: "text-red-400",    bg: "bg-red-400/15",    desc: "Holds you accountable", premiumOnly: true  },
  { key: "detailed",    label: "Deep Dive",  faIcon: "fa-microscope", color: "text-violet-400", bg: "bg-violet-400/15", desc: "Thorough & in-depth",   premiumOnly: true  },
];

const EXAMPLE_PROMPTS = [
  { icon: "fa-atom",       text: "Explain Newton's Laws of Motion" },
  { icon: "fa-dna",        text: "How does DNA replication work?" },
  { icon: "fa-flask",      text: "What is Le Chatelier's Principle?" },
  { icon: "fa-calculator", text: "Walk me through solving quadratic equations" },
];

const BASE_URL = (import.meta.env.VITE_API_URL as string) || "/api/v1";

/* ── Helpers ────────────────────────────────────────────────────────────── */

function stripActionBlock(text: string): string {
  return text.replace(/ACTION:\{[\s\S]*?\}(\n|$)?/, "").trim();
}

function parseActionBlock(text: string): AgentAction | null {
  const m = text.match(/ACTION:(\{[\s\S]*?\})(\n|$)?/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function groupChatsByDate(chats: ChatSummary[]): { label: string; items: ChatSummary[] }[] {
  const now = Date.now();
  const DAY = 86400000;
  const groups = [
    { label: "Today",     cutoff: now - DAY },
    { label: "Yesterday", cutoff: now - 2 * DAY },
    { label: "This Week", cutoff: now - 7 * DAY },
    { label: "Older",     cutoff: 0 },
  ];
  const result: { label: string; items: ChatSummary[] }[] = [];
  let remaining = [...chats].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  for (const { label, cutoff } of groups) {
    const items = remaining.filter(c => new Date(c.updatedAt).getTime() > cutoff);
    remaining   = remaining.filter(c => new Date(c.updatedAt).getTime() <= cutoff);
    if (items.length > 0) result.push({ label, items });
  }
  if (remaining.length > 0) result.push({ label: "Older", items: remaining });
  return result;
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function TeacherChat() {
  const { user }  = useAuth();
  const isPremium = user?.role === "premium";
  const params    = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();

  /* History panel (slide-over, closed by default — not a permanent sidebar) */
  const [historyOpen,    setHistoryOpen]    = useState(false);
  const [sidebarSearch,  setSidebarSearch]  = useState("");
  const [styleMenuOpen,  setStyleMenuOpen]  = useState(false);
  const [chats,          setChats]          = useState<ChatSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [deleting,       setDeleting]       = useState<string | null>(null);

  /* Chat state */
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [input,        setInput]        = useState("");
  const [chatId,       setChatId]       = useState<string | null>(null);
  const [chatTitle,    setChatTitle]    = useState("New Chat");
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle,    setTempTitle]    = useState("");
  const [style,        setStyle]        = useState<TeachingStyle>("default");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [examPrepMode, setExamPrepMode] = useState(false);
  const [initialised,  setInitialised]  = useState(false);

  /* Refs */
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef    = useRef<HTMLInputElement>(null);

  /* ── Load history ──────────────────────────────────────────────────── */
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/teacher/history");
      setChats(data.data || []);
    } catch { setChats([]); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  /* ── Deep-link: load chat from URL param ─────────────────────────── */
  useEffect(() => {
    if (!params?.id || initialised) return;
    setInitialised(true);
    api.get(`/teacher/chats/${params.id}`)
      .then(({ data }) => {
        const chat = data.data;
        setMessages((chat.messages || []).map((m: any) => ({ role: m.role, content: m.content })));
        setChatId(chat._id);
        setChatTitle(chat.title || "Chat");
        setStyle(chat.teachingStyle || "default");
        setError("");
        setHistoryOpen(false);
      })
      .catch(() => setError("Could not load that chat."));
  }, [params?.id, initialised]);

  /* Sync URL when chatId changes */
  useEffect(() => {
    if (!chatId) return;
    const target = `/chat/tutor/${chatId}`;
    if (!window.location.pathname.endsWith(chatId)) {
      setLocation(target, { replace: true });
    }
  }, [chatId, setLocation]);

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* Auto-resize textarea */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  /* Focus title input when editing */
  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  /* ── Chat actions ──────────────────────────────────────────────────── */
  const openNewChat = () => {
    setMessages([]);
    setChatId(null);
    setChatTitle("New Chat");
    setError("");
    setExamPrepMode(false);
    setStyle("default");
    setInitialised(true);
    setLocation("/teacher", { replace: true });
    setHistoryOpen(false);
  };

  const openExistingChat = async (c: ChatSummary) => {
    try {
      const { data } = await api.get(`/teacher/chats/${c._id}`);
      const chat = data.data;
      setMessages((chat.messages || []).map((m: any) => ({ role: m.role, content: m.content })));
      setChatId(chat._id);
      setChatTitle(chat.title || c.title);
      setStyle(chat.teachingStyle || "default");
      setError("");
      setHistoryOpen(false);
    } catch { setError("Failed to load chat."); }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(id);
    try {
      await api.delete(`/teacher/chats/${id}`);
      setChats(prev => prev.filter(c => c._id !== id));
      if (chatId === id) openNewChat();
    } catch { }
    finally { setDeleting(null); }
  };

  /* ── Streaming send ────────────────────────────────────────────────── */
  const sendMessage = async (questionOverride?: string) => {
    const question = (questionOverride ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setError("");
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);

    let streamSucceeded = false;
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(`${BASE_URL}/teacher/ask-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question, chatId, style, examPrepMode }),
      });

      if (!response.ok || !response.body) throw new Error("stream_failed");

      streamSucceeded = true;
      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          // Parse JSON separately so we can distinguish parse failures
          // from explicit server-sent error events
          let evt: any;
          try { evt = JSON.parse(part.slice(6)); } catch { continue; }

            if (evt.type === "meta") {
              if (!chatId && evt.chatId) setChatId(evt.chatId);
              if (evt.title) setChatTitle(evt.title);
            }
            if (evt.type === "token") {
              setMessages(prev => {
                const msgs = [...prev];
                const last = msgs[msgs.length - 1];
                msgs[msgs.length - 1] = { ...last, content: last.content + evt.content };
                return msgs;
              });
            }
            if (evt.type === "done") {
              if (evt.chatId) setChatId(evt.chatId);
              setMessages(prev => {
                const m = [...prev];
                const last = m[m.length - 1];
                const action = evt.action || parseActionBlock(last.content);
                const cleanContent = stripActionBlock(last.content);
                m[m.length - 1] = { ...last, content: cleanContent, streaming: false, action: action || null };
                return m;
              });
            }
            if (evt.type === "error") {
              // Finalise streaming message then surface error
              setMessages(prev => {
                const m = [...prev];
                if (m[m.length - 1]?.streaming) {
                  const last = m[m.length - 1];
                  m[m.length - 1] = { ...last, content: stripActionBlock(last.content), streaming: false };
                }
                return m;
              });
              setError(evt.message || "Something went wrong.");
            }
        }
      }

      loadHistory();
    } catch {
      if (streamSucceeded) {
        setMessages(prev => {
          const m = [...prev];
          if (m[m.length - 1]?.streaming) {
            const last = m[m.length - 1];
            m[m.length - 1] = { ...last, content: stripActionBlock(last.content), streaming: false };
          }
          return m;
        });
      } else {
        try {
          const payload: any = { question, style, examPrepMode };
          if (chatId) payload.chatId = chatId;
          const { data } = await api.post("/teacher/ask", payload);
          const d = data.data;
          if (!chatId && d.chatId) setChatId(d.chatId);
          if (d.title) setChatTitle(d.title);
          setMessages(prev => [...prev, { role: "assistant", content: d.answer, action: d.action || null }]);
          loadHistory();
        } catch (fallbackErr: any) {
          setError(fallbackErr?.response?.data?.message || "Something went wrong. Please try again.");
          setMessages(prev => prev.slice(0, -1));
          setInput(question);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ── Export PDF ────────────────────────────────────────────────────── */
  const exportAsPDF = () => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const styleInfo = STYLES.find(s => s.key === style)!;
    const rows = messages
      .filter(m => !m.streaming)
      .map(m => `<div class="msg ${m.role}"><div class="label">${m.role === "user" ? "You" : "TeachBuddy"}</div><div class="content">${m.content.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")}</div></div>`)
      .join("");
    pw.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${chatTitle}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;max-width:680px;margin:48px auto;color:#1a1a1a;line-height:1.6;padding:0 24px}
      h1{font-size:22px;font-weight:700;margin-bottom:4px}.meta{font-size:12px;color:#666;margin-bottom:36px;border-bottom:1px solid #e5e7eb;padding-bottom:16px}
      .msg{margin:24px 0}.label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px}
      .user .label{color:#2563eb}.assistant .label{color:#7c3aed}
      .content{font-size:14px;line-height:1.75;white-space:pre-wrap;word-wrap:break-word}
      .user .content{background:#f0f4ff;padding:12px 16px;border-radius:8px}@media print{body{margin:0}}</style>
      </head><body><h1>${chatTitle}</h1>
      <div class="meta">TeachBuddy · ${styleInfo.label} · Exported ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div>
      ${rows}</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 400);
  };

  /* ── Derived ───────────────────────────────────────────────────────── */
  const styleInfo     = STYLES.find(s => s.key === style) ?? STYLES[0];
  const filteredChats = chats.filter(c =>
    sidebarSearch
      ? c.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
        (c.preview || "").toLowerCase().includes(sidebarSearch.toLowerCase())
      : true
  );
  const grouped = groupChatsByDate(filteredChats);

  /* ── Collect context material from conversation ─────────────────────── */
  const getContextMaterial = () =>
    messages.filter(m => !m.streaming).map(m => m.content).join("\n\n").slice(0, 4000);

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden bg-background">

      {/* ── Conversation history — slide-over panel (never pushes layout) ── */}
      {historyOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={() => setHistoryOpen(false)} />
      )}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border shadow-2xl
        w-[85vw] max-w-80 transition-transform duration-200 ease-out
        ${historyOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-clock-rotate-left text-primary text-sm" />
            </div>
            <span className="text-sm font-semibold text-foreground flex-1 truncate">Conversations</span>
            <button onClick={() => setHistoryOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>

          {/* New chat */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0">
            <button onClick={openNewChat}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary hover:opacity-90 transition-all">
              <i className="fa-solid fa-plus text-xs" />New Chat
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pb-3 flex-shrink-0">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              <input type="text" value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)}
                placeholder="Search chats…"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
            </div>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {historyLoading ? (
              <div className="flex items-center justify-center py-10">
                <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : grouped.length === 0 ? (
              <div className="text-center py-10 px-3">
                <i className="fa-solid fa-comment-dots text-muted-foreground/30 text-2xl mb-2 block" />
                <p className="text-xs text-muted-foreground">
                  {sidebarSearch ? "No chats match." : "No chats yet. Start one!"}
                </p>
              </div>
            ) : grouped.map(group => (
              <div key={group.label} className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-2 mb-1.5">{group.label}</p>
                {group.items.map(chat => {
                  const s = STYLES.find(x => x.key === chat.teachingStyle) ?? STYLES[0];
                  const isActive = chatId === chat._id;
                  return (
                    <div key={chat._id} onClick={() => openExistingChat(chat)}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-0.5 ${
                        isActive ? "bg-primary/10 text-foreground" : "hover:bg-muted/60 text-foreground"
                      }`}>
                      <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                        <i className={`fa-solid ${s.faIcon} ${s.color} text-xs`} />
                      </div>
                      <div className="flex-1 min-w-0 pr-5">
                        <p className="text-xs font-medium text-foreground truncate leading-snug">{chat.title}</p>
                        {chat.preview && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5 leading-snug">{chat.preview}</p>
                        )}
                      </div>
                      <button onClick={e => handleDeleteChat(chat._id, e)} disabled={deleting === chat._id}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all absolute right-2 top-1/2 -translate-y-1/2">
                        {deleting === chat._id
                          ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                          : <i className="fa-solid fa-trash text-[10px]" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full">

        {/* Top bar */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border flex-shrink-0 bg-card">
          <button onClick={() => setHistoryOpen(true)}
            title="Conversation history"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all flex-shrink-0">
            <i className="fa-solid fa-clock-rotate-left text-xs" />
            <span className="hidden sm:inline">History</span>
          </button>

          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input ref={titleRef} value={tempTitle} onChange={e => setTempTitle(e.target.value)}
                onBlur={() => { setChatTitle(tempTitle.trim() || "New Chat"); setEditingTitle(false); }}
                onKeyDown={e => {
                  if (e.key === "Enter") { setChatTitle(tempTitle.trim() || "New Chat"); setEditingTitle(false); }
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="text-sm font-semibold text-foreground bg-muted/50 border border-primary/40 rounded-lg px-2 py-1 w-full max-w-xs focus:outline-none" />
            ) : (
              <button onClick={() => { setTempTitle(chatTitle); setEditingTitle(true); }}
                className="flex items-center gap-2 group">
                <span className="text-sm font-semibold text-foreground truncate max-w-[160px] sm:max-w-xs">{chatTitle}</span>
                <i className="fa-solid fa-pen text-[9px] text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              </button>
            )}
          </div>

          <div className="relative flex-shrink-0">
            <button onClick={() => setStyleMenuOpen(v => !v)}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg ${styleInfo.bg} hover:opacity-80 transition-opacity`}>
              <i className={`fa-solid ${styleInfo.faIcon} ${styleInfo.color} text-xs`} />
              <span className={`hidden sm:inline text-xs font-medium ${styleInfo.color}`}>{styleInfo.label}</span>
              <i className={`fa-solid fa-chevron-down text-[8px] ${styleInfo.color}`} />
            </button>

            {styleMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStyleMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-card border border-border rounded-2xl shadow-xl p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-2.5 px-1">Teaching Style</p>
                  <div className="grid grid-cols-3 gap-2">
                    {STYLES.map(s => {
                      const locked = s.premiumOnly && !isPremium;
                      const active = style === s.key;
                      return (
                        <button key={s.key} onClick={() => { if (!locked) { setStyle(s.key); setStyleMenuOpen(false); } }} disabled={locked}
                          title={locked ? `${s.label} — Premium only` : `${s.label} — ${s.desc}`}
                          className={`relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all ${
                            active ? `${s.bg} border-primary/30`
                              : locked ? "opacity-30 cursor-not-allowed bg-muted border-transparent"
                                : "bg-muted/50 border-transparent hover:border-border"
                          }`}>
                          <i className={`fa-solid ${s.faIcon} ${active ? s.color : "text-muted-foreground"} text-xs`} />
                          <span className={`text-[9px] font-semibold leading-none ${active ? s.color : "text-muted-foreground"}`}>{s.label}</span>
                          {locked && <i className="fa-solid fa-lock text-[7px] text-muted-foreground absolute top-1 right-1" />}
                        </button>
                      );
                    })}
                  </div>
                  {!isPremium && (
                    <a href="/premium" className="text-[10px] text-primary hover:underline mt-3 block px-1">Upgrade for all styles →</a>
                  )}
                </div>
              </>
            )}
          </div>

          {messages.length > 0 && (
            <button onClick={exportAsPDF}
              className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex-shrink-0">
              <i className="fa-solid fa-file-pdf text-xs" />PDF
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center min-h-[50vh]">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-5 shadow-sm">
                <i className="fa-solid fa-chalkboard-user text-primary text-xl sm:text-2xl" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">How can I help you learn today?</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8 max-w-sm">
                Ask me anything — I adapt to your pace and remember the whole conversation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-lg">
                {EXAMPLE_PROMPTS.map(p => (
                  <button key={p.text} onClick={() => sendMessage(p.text)}
                    className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border border-border bg-card hover:bg-muted transition-all text-left group">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <i className={`fa-solid ${p.icon} text-primary text-xs sm:text-sm`} />
                    </div>
                    <span className="text-xs sm:text-sm text-foreground/80 group-hover:text-foreground transition-colors">{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => {
            const isUser = msg.role === "user";
            // Only show action cards for AI messages where user's prior message matched patterns
            const precedingUserMsg = !isUser && i > 0 ? messages[i - 1] : null;
            const showActionCards  = !isUser && !msg.streaming && !msg.action && precedingUserMsg?.role === "user";

            return (
              <div key={i} className={`flex gap-2.5 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                {/* Avatar */}
                {!isUser && (
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${styleInfo.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <i className={`fa-solid ${styleInfo.faIcon} ${styleInfo.color} text-xs sm:text-sm`} />
                  </div>
                )}

                <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[80%] sm:max-w-[78%]`}>
                  {/* Bubble */}
                  <div className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-card border border-border/60 text-foreground rounded-tl-sm shadow-sm"
                  }`}>
                    {isUser ? (
                      <span className="whitespace-pre-wrap text-xs sm:text-sm">{msg.content}</span>
                    ) : msg.streaming && msg.content === "" ? (
                      <span className="flex items-center gap-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    ) : (
                      <div className="text-xs sm:text-sm">
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    )}
                  </div>

                  {/* Streaming cursor */}
                  {msg.streaming && msg.content !== "" && (
                    <span className="mt-1 ml-1 w-1.5 h-4 bg-primary/60 rounded-full animate-pulse inline-block" />
                  )}

                  {/* Agentic action (when AI was asked to create something) */}
                  {msg.action && !msg.streaming && (
                    <AgenticStep
                      action={msg.action}
                      contextMaterial={getContextMaterial()}
                    />
                  )}

                  {/* Contextual action cards (only when relevant) */}
                  {showActionCards && (
                    <AIActionCards userMessage={precedingUserMsg!.content} className="mt-2" />
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading state (before first token) */}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2.5 sm:gap-3">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${styleInfo.bg} flex items-center justify-center flex-shrink-0`}>
                <i className={`fa-solid ${styleInfo.faIcon} ${styleInfo.color} text-xs sm:text-sm`} />
              </div>
              <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
        <div className="border-t border-border px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0 bg-card">
          {/* Exam prep toggle */}
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <button
              onClick={() => setExamPrepMode(p => !p)}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                examPrepMode
                  ? "bg-amber-400/20 text-amber-400 border border-amber-400/30"
                  : "bg-muted text-muted-foreground border border-border hover:border-primary/30"
              }`}
            >
              <i className="fa-solid fa-graduation-cap text-[10px]" />
              <span className="hidden sm:inline">Exam Prep</span>
              <span className="sm:hidden">Exam</span>
            </button>
            {examPrepMode && (
              <span className="text-[10px] text-amber-400/70">Searches past papers</span>
            )}
          </div>

          <div className="flex gap-2 sm:gap-2.5 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything…"
                disabled={loading}
                rows={1}
                className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none leading-relaxed"
                style={{ minHeight: "42px", maxHeight: "120px" }}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center flex-shrink-0"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <i className="fa-solid fa-paper-plane text-xs" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
