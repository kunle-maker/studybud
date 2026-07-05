import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface Collaborator {
  user: { _id: string; name: string; profilePicture?: string; email?: string };
  role: "editor" | "viewer";
  joinedAt: string;
}

interface Comment {
  _id: string;
  author: { _id: string; name: string; profilePicture?: string };
  content: string;
  mentions: { _id: string; name: string }[];
  resolved: boolean;
  resolvedBy?: { name: string };
  createdAt: string;
}

interface ActivityItem {
  _id: string;
  actor: { _id: string; name: string; profilePicture?: string };
  action: string;
  detail: string;
  createdAt: string;
}

interface Assignment {
  _id: string;
  title: string;
  description: string;
  creator: { _id: string; name: string; profilePicture?: string; email?: string };
  collaborators: Collaborator[];
  shareToken?: string;
  shareEnabled: boolean;
  status: "open" | "in_progress" | "completed";
  dueDate?: string;
  comments?: Comment[];
  activity?: ActivityItem[];
  updatedAt: string;
  createdAt: string;
}

const STATUS_COLORS = {
  open:        "text-blue-400 bg-blue-400/15 border-blue-400/25",
  in_progress: "text-amber-400 bg-amber-400/15 border-amber-400/25",
  completed:   "text-emerald-400 bg-emerald-400/15 border-emerald-400/25",
};
const STATUS_LABELS = { open: "Open", in_progress: "In Progress", completed: "Completed" };
const STATUS_ICONS  = { open: "fa-circle", in_progress: "fa-spinner", completed: "fa-circle-check" };

const ACTION_ICONS: Record<string, string> = {
  created:           "fa-plus",
  updated:           "fa-pen",
  commented:         "fa-comment",
  invited:           "fa-user-plus",
  joined:            "fa-door-open",
  completed:         "fa-circle-check",
  resolved_comment:  "fa-check-double",
  unresolved_comment:"fa-rotate-left",
};

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function Avatar({ user, size = "sm" }: { user?: { name?: string; profilePicture?: string }; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden bg-primary/20`}>
      {user?.profilePicture
        ? <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
        : <span className="font-semibold text-primary">{user?.name?.[0]?.toUpperCase() || "?"}</span>}
    </div>
  );
}

export default function Assignments() {
  const { user } = useAuth();
  const [view,           setView]           = useState<"list" | "detail" | "create">("list");
  const [assignments,    setAssignments]    = useState<Assignment[]>([]);
  const [selected,       setSelected]       = useState<Assignment | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);
  const [error,          setError]          = useState("");

  // Create form
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc,  setCreateDesc]  = useState("");
  const [createDue,   setCreateDue]   = useState("");
  const [creating,    setCreating]    = useState(false);
  const [confirmDeleteAssignment, setConfirmDeleteAssignment] = useState(false);

  // Invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole,  setInviteRole]  = useState<"editor" | "viewer">("editor");
  const [inviting,    setInviting]    = useState(false);
  const [inviteMsg,   setInviteMsg]   = useState("");

  // Comments
  const [commentText, setCommentText] = useState("");
  const [commenting,  setCommenting]  = useState(false);

  // Share
  const [shareCopied, setShareCopied] = useState(false);

  const commentRef = useRef<HTMLTextAreaElement>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/assignments");
      setAssignments(data.data.assignments || []);
    } catch { setError("Could not load assignments."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = async (id: string) => {
    setActionLoading("open_" + id);
    setError("");
    try {
      const { data } = await api.get(`/assignments/${id}`);
      setSelected(data.data);
      setView("detail");
    } catch { setError("Could not load assignment."); }
    finally { setActionLoading(null); }
  };

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;
    setCreating(true);
    setError("");
    try {
      const { data } = await api.post("/assignments", {
        title: createTitle.trim(),
        description: createDesc.trim(),
        dueDate: createDue || undefined,
      });
      await loadList();
      setCreateTitle(""); setCreateDesc(""); setCreateDue("");
      await openDetail(data.data._id);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create assignment.");
    } finally { setCreating(false); }
  };

  const updateStatus = async (status: Assignment["status"]) => {
    if (!selected) return;
    setActionLoading("status");
    try {
      await api.patch(`/assignments/${selected._id}`, { status });
      const { data } = await api.get(`/assignments/${selected._id}`);
      setSelected(data.data);
      setAssignments(prev => prev.map(a => a._id === selected._id ? { ...a, status } : a));
    } catch { setError("Failed to update status."); }
    finally { setActionLoading(null); }
  };

  const deleteAssignment = async () => {
    if (!selected) return;
    setActionLoading("delete");
    setConfirmDeleteAssignment(false);
    try {
      await api.delete(`/assignments/${selected._id}`);
      setAssignments(prev => prev.filter(a => a._id !== selected._id));
      setSelected(null); setView("list");
    } catch { setError("Failed to delete assignment."); }
    finally { setActionLoading(null); }
  };

  const toggleShareLink = async () => {
    if (!selected) return;
    setActionLoading("share");
    try {
      const { data } = await api.post(`/assignments/${selected._id}/share`, {
        enabled: !selected.shareEnabled,
      });
      setSelected(prev => prev ? { ...prev, shareToken: data.data.shareToken, shareEnabled: data.data.shareEnabled } : prev);
    } catch { setError("Failed to update share settings."); }
    finally { setActionLoading(null); }
  };

  const copyShareLink = () => {
    if (!selected?.shareToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/assignments/join/${selected.shareToken}`);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !inviteEmail.trim()) return;
    setInviting(true); setInviteMsg("");
    try {
      await api.post(`/assignments/${selected._id}/invite`, { email: inviteEmail.trim(), role: inviteRole });
      const { data } = await api.get(`/assignments/${selected._id}`);
      setSelected(data.data);
      setInviteEmail(""); setInviteMsg("Invited successfully.");
    } catch (err: any) {
      setInviteMsg(err?.response?.data?.message || "Failed to invite.");
    } finally { setInviting(false); }
  };

  const removeCollaborator = async (userId: string) => {
    if (!selected) return;
    setActionLoading("remove_" + userId);
    try {
      await api.delete(`/assignments/${selected._id}/collaborators/${userId}`);
      const { data } = await api.get(`/assignments/${selected._id}`);
      setSelected(data.data);
    } catch { setError("Failed to remove collaborator."); }
    finally { setActionLoading(null); }
  };

  const addComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !commentText.trim()) return;
    setCommenting(true); setError("");
    try {
      await api.post(`/assignments/${selected._id}/comments`, { content: commentText.trim() });
      const { data } = await api.get(`/assignments/${selected._id}`);
      setSelected(data.data);
      setCommentText("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to add comment.");
    } finally { setCommenting(false); }
  };

  const resolveComment = async (commentId: string) => {
    if (!selected) return;
    setActionLoading("resolve_" + commentId);
    try {
      await api.patch(`/assignments/${selected._id}/comments/${commentId}/resolve`);
      const { data } = await api.get(`/assignments/${selected._id}`);
      setSelected(data.data);
    } catch { setError("Failed to resolve comment."); }
    finally { setActionLoading(null); }
  };

  const deleteComment = async (commentId: string) => {
    if (!selected) return;
    setActionLoading("del_comment_" + commentId);
    try {
      await api.delete(`/assignments/${selected._id}/comments/${commentId}`);
      const { data } = await api.get(`/assignments/${selected._id}`);
      setSelected(data.data);
    } catch { setError("Failed to delete comment."); }
    finally { setActionLoading(null); }
  };

  const isCreator = selected && user && (
    typeof selected.creator === "object"
      ? (selected.creator as any)._id === user._id
      : selected.creator === user._id
  );
  const isEditor = selected && user && (
    isCreator ||
    selected.collaborators.some(c => c.user._id === user._id && c.role === "editor")
  );

  // ── Create view ──────────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="max-w-2xl space-y-6">
        <button onClick={() => { setView("list"); setError(""); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <i className="fa-solid fa-arrow-left" />Back
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground">New Assignment</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a collaborative assignment to share with classmates.</p>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/15 border border-destructive/30 text-destructive">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
          </div>
        )}
        <form onSubmit={createAssignment} className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title *</label>
            <input
              value={createTitle} onChange={e => setCreateTitle(e.target.value)}
              placeholder="e.g. Chapter 5 — Calculus Problems"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea
              value={createDesc} onChange={e => setCreateDesc(e.target.value)}
              placeholder="What is this assignment about?"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due Date (optional)</label>
            <input
              type="date" value={createDue} onChange={e => setCreateDue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
          <button type="submit" disabled={creating || !createTitle.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50">
            {creating ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <i className="fa-solid fa-plus" />}
            Create Assignment
          </button>
        </form>
      </div>
    );
  }

  // ── Detail view ──────────────────────────────────────────────────────────────
  if (view === "detail" && selected) {
    const comments  = selected.comments  || [];
    const activity  = (selected.activity  || []).slice().reverse();
    const collabs   = selected.collaborators || [];
    return (
      <div className="max-w-3xl space-y-6">
        {/* Delete confirmation dialog */}
        {confirmDeleteAssignment && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-foreground">Delete this assignment?</h3>
              <p className="text-sm text-muted-foreground">
                This permanently deletes <span className="font-semibold text-foreground">"{selected.title}"</span> and all its comments and activity. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDeleteAssignment(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                  Cancel
                </button>
                <button onClick={deleteAssignment}
                  disabled={actionLoading === "delete"}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold bg-destructive text-white hover:bg-destructive/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {actionLoading === "delete"
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <i className="fa-solid fa-trash-can text-xs" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        <button onClick={() => { setSelected(null); setView("list"); setError(""); loadList(); }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <i className="fa-solid fa-arrow-left" />All assignments
        </button>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/15 border border-destructive/30 text-destructive">
            <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
            <button onClick={() => setError("")} className="ml-auto"><i className="fa-solid fa-xmark" /></button>
          </div>
        )}

        {/* Header card */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3 justify-between flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground">{selected.title}</h1>
              {selected.description && <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>}
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border flex-shrink-0 ${STATUS_COLORS[selected.status]}`}>
              <i className={`fa-solid ${STATUS_ICONS[selected.status]}`} />{STATUS_LABELS[selected.status]}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span><i className="fa-solid fa-user mr-1" />Created by {typeof selected.creator === "object" ? selected.creator.name : "you"}</span>
            <span><i className="fa-regular fa-clock mr-1" />{timeAgo(selected.createdAt)}</span>
            {selected.dueDate && <span className="text-amber-400"><i className="fa-solid fa-calendar mr-1" />Due {fmtDate(selected.dueDate)}</span>}
          </div>

          {/* Status buttons (creator or editor) */}
          {isEditor && (
            <div className="flex gap-2 flex-wrap">
              {(["open", "in_progress", "completed"] as Assignment["status"][]).map(s => (
                <button key={s} onClick={() => updateStatus(s)}
                  disabled={selected.status === s || actionLoading === "status"}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 ${
                    selected.status === s ? STATUS_COLORS[s] : "border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
              {isCreator && (
                <button onClick={() => setConfirmDeleteAssignment(true)} disabled={actionLoading === "delete"}
                  className="ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50">
                  {actionLoading === "delete" ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin inline-block" /> : <i className="fa-solid fa-trash-can" />}
                  {" "}Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Two-column: left=comments, right=sidebar */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Comments (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              <i className="fa-solid fa-comments text-primary mr-2" />Comments
              <span className="text-muted-foreground font-normal ml-1.5">({comments.length})</span>
            </h2>

            {comments.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <i className="fa-solid fa-comments text-muted-foreground text-2xl mb-2" />
                <p className="text-sm text-muted-foreground">No comments yet. Start the conversation!</p>
              </div>
            )}

            <div className="space-y-3">
              {comments.map(c => (
                <div key={c._id} className={`bg-card border rounded-2xl p-4 space-y-2 transition-all ${c.resolved ? "border-emerald-400/30 opacity-70" : "border-border"}`}>
                  <div className="flex items-start gap-2.5">
                    <Avatar user={c.author} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">{c.author.name}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                        {c.resolved && (
                          <span className="text-xs text-emerald-400 font-medium">
                            <i className="fa-solid fa-check-double mr-1" />Resolved
                            {c.resolvedBy && ` by ${c.resolvedBy.name}`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-1 break-words">{c.content}</p>
                      {c.mentions.length > 0 && (
                        <p className="text-xs text-primary mt-0.5">
                          {c.mentions.map(m => `@${m.name}`).join(" ")}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isEditor && (
                        <button onClick={() => resolveComment(c._id)}
                          disabled={!!actionLoading}
                          title={c.resolved ? "Mark unresolved" : "Mark resolved"}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50">
                          {actionLoading === "resolve_" + c._id
                            ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                            : <i className={`fa-solid ${c.resolved ? "fa-rotate-left" : "fa-check-double"} text-xs`} />}
                        </button>
                      )}
                      {user && c.author._id === user._id && (
                        <button onClick={() => deleteComment(c._id)}
                          disabled={!!actionLoading}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50">
                          {actionLoading === "del_comment_" + c._id
                            ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                            : <i className="fa-solid fa-trash-can text-xs" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment input */}
            <form onSubmit={addComment} className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <textarea
                ref={commentRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment… Use @Name to mention someone"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
              />
              <div className="flex justify-end">
                <button type="submit" disabled={commenting || !commentText.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50">
                  {commenting ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <i className="fa-solid fa-paper-plane" />}
                  Comment
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-4">
            {/* Collaborators */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <i className="fa-solid fa-users mr-1.5" />Collaborators
              </h3>
              <div className="space-y-2">
                {/* Creator */}
                <div className="flex items-center gap-2">
                  <Avatar user={typeof selected.creator === "object" ? selected.creator : undefined} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {typeof selected.creator === "object" ? selected.creator.name : "Creator"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Creator</p>
                  </div>
                </div>
                {collabs.map(c => (
                  <div key={c.user._id} className="flex items-center gap-2">
                    <Avatar user={c.user} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{c.user.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{c.role}</p>
                    </div>
                    {isCreator && c.user._id !== user?._id && (
                      <button onClick={() => removeCollaborator(c.user._id)}
                        disabled={!!actionLoading}
                        className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-all disabled:opacity-50">
                        <i className="fa-solid fa-xmark text-xs" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Invite */}
              {isCreator && (
                <form onSubmit={invite} className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground">Invite by email</p>
                  <input
                    type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                  <div className="flex gap-2">
                    <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)}
                      className="px-2 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none">
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button type="submit" disabled={inviting || !inviteEmail.trim()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50">
                      {inviting ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <i className="fa-solid fa-user-plus" />}
                      Invite
                    </button>
                  </div>
                  {inviteMsg && (
                    <p className={`text-xs ${inviteMsg.includes("success") ? "text-emerald-400" : "text-destructive"}`}>{inviteMsg}</p>
                  )}
                </form>
              )}
            </div>

            {/* Share link */}
            {isCreator && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <i className="fa-solid fa-link mr-1.5" />Share Link
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{selected.shareEnabled ? "Link active" : "Link disabled"}</span>
                  <button onClick={toggleShareLink} disabled={actionLoading === "share"}
                    className={`relative w-10 h-5 rounded-full transition-all ${selected.shareEnabled ? "bg-primary" : "bg-muted"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${selected.shareEnabled ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                </div>
                {selected.shareEnabled && selected.shareToken && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground break-all font-mono">
                      …/assignments/join/{selected.shareToken.slice(0, 10)}…
                    </p>
                    <button onClick={copyShareLink}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-all">
                      <i className={`fa-solid ${shareCopied ? "fa-check" : "fa-copy"} text-xs`} />
                      {shareCopied ? "Copied!" : "Copy link"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Activity */}
            {activity.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <i className="fa-solid fa-timeline mr-1.5" />Activity
                </h3>
                <div className="space-y-2.5">
                  {activity.slice(0, 8).map((a, i) => (
                    <div key={a._id || i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className={`fa-solid ${ACTION_ICONS[a.action] || "fa-circle"} text-[8px] text-primary`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground">
                          <span className="font-semibold">{a.actor?.name || "Someone"}</span>{" "}
                          {a.detail || a.action}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{timeAgo(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-clipboard-list text-primary" />
            Assignments
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Collaborate on assignments with classmates.</p>
        </div>
        <button onClick={() => { setView("create"); setError(""); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all">
          <i className="fa-solid fa-plus" />New Assignment
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm bg-destructive/15 border border-destructive/30 text-destructive">
          <i className="fa-solid fa-circle-exclamation flex-shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-2xl animate-pulse" />)}
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-14 text-center">
          <i className="fa-solid fa-clipboard-list text-muted-foreground text-3xl mb-3" />
          <p className="text-sm font-medium text-foreground">No assignments yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Create one or join via a share link from a classmate.</p>
          <button onClick={() => setView("create")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all">
            <i className="fa-solid fa-plus" />Create Assignment
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const isOwn = user && (typeof a.creator === "object" ? (a.creator as any)._id === user._id : a.creator === user._id);
            return (
              <button key={a._id} onClick={() => openDetail(a._id)}
                disabled={actionLoading === "open_" + a._id}
                className="w-full bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md transition-all group flex items-center gap-4 disabled:opacity-60">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${STATUS_COLORS[a.status]}`}>
                  <i className={`fa-solid ${STATUS_ICONS[a.status]} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{a.title}</p>
                    {!isOwn && <span className="text-[10px] font-semibold text-blue-400 bg-blue-400/15 px-1.5 py-0.5 rounded border border-blue-400/25">Shared</span>}
                  </div>
                  {a.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{a.collaborators.length + 1} member{a.collaborators.length ? "s" : ""}</span>
                    <span>{timeAgo(a.updatedAt)}</span>
                    {a.dueDate && <span className="text-amber-400"><i className="fa-solid fa-calendar mr-1" />{fmtDate(a.dueDate)}</span>}
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-muted-foreground text-xs group-hover:text-primary transition-colors flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
