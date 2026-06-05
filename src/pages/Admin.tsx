import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface StaggeringCase {
  _id: string;
  createdAt: string;
  receiptImageUrl?: string;
  verificationNote?: string;
  transactionId?: string | null;
  adminNote?: string | null;
  user: {
    _id: string;
    name: string;
    email?: string;
    profilePicture?: string;
    role: string;
  };
}

interface PremiumUser {
  _id: string;
  name: string;
  email?: string;
  profilePicture?: string;
  role: string;
  authProvider?: string;
  premiumUntil?: string;
  createdAt: string;
  isAdmin?: boolean;
  subscription?: { endDate?: string; isStaggering?: boolean } | null;
}

interface DashStats {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  pendingStaggering: number;
}

type Tab = "overview" | "staggering" | "premium";

export default function Admin() {
  const { user } = useAuth();

  if (!user?.isAdmin) return <Redirect to="/" />;

  const [tab,           setTab]           = useState<Tab>("overview");
  const [stats,         setStats]         = useState<DashStats | null>(null);
  const [staggering,    setStaggering]    = useState<StaggeringCase[]>([]);
  const [premiumUsers,  setPremiumUsers]  = useState<PremiumUser[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [noteInputs,    setNoteInputs]    = useState<Record<string, string>>({});
  const [imageModal,    setImageModal]    = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/dashboard");
      setStats(data.data.stats);
      setStaggering(data.data.recentStaggering || []);
    } catch { } finally { setLoading(false); }
  }, []);

  const fetchStaggering = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/staggering");
      setStaggering(data.data.cases || []);
    } catch { } finally { setLoading(false); }
  }, []);

  const fetchPremiumUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/premium-users");
      setPremiumUsers(data.data.users || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === "overview") fetchDashboard();
    else if (t === "staggering") fetchStaggering();
    else if (t === "premium") fetchPremiumUsers();
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id + "_approve");
    try {
      await api.post(`/admin/staggering/${id}/approve`, { note: noteInputs[id] || "Approved by admin." });
      setStaggering(prev => prev.filter(c => c._id !== id));
      if (stats) setStats(s => s ? { ...s, pendingStaggering: Math.max(0, s.pendingStaggering - 1) } : s);
    } catch { } finally { setActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id + "_reject");
    try {
      await api.post(`/admin/staggering/${id}/reject`, { note: noteInputs[id] || "Rejected by admin." });
      setStaggering(prev => prev.filter(c => c._id !== id));
      if (stats) setStats(s => s ? { ...s, pendingStaggering: Math.max(0, s.pendingStaggering - 1) } : s);
    } catch { } finally { setActionLoading(null); }
  };

  const handleRevoke = async (userId: string, name: string) => {
    if (!confirm(`Revoke premium for ${name}?`)) return;
    setActionLoading(userId + "_revoke");
    try {
      await api.post(`/admin/revoke/${userId}`);
      setPremiumUsers(prev => prev.filter(u => u._id !== userId));
      if (stats) setStats(s => s ? { ...s, premiumUsers: Math.max(0, s.premiumUsers - 1), freeUsers: s.freeUsers + 1 } : s);
    } catch { } finally { setActionLoading(null); }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const TABS: { key: Tab; label: string; icon: string; badge?: number }[] = [
    { key: "overview",   label: "Overview",         icon: "fa-chart-simple" },
    { key: "staggering", label: "Pending Review",   icon: "fa-triangle-exclamation", badge: stats?.pendingStaggering },
    { key: "premium",    label: "Premium Users",    icon: "fa-crown" },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      {imageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setImageModal(null)}>
          <img src={imageModal} alt="Receipt" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20" onClick={() => setImageModal(null)}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-primary" />Admin Panel
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Developer access — StudyBud control centre</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 px-3 py-1.5 rounded-full"
          style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.28)" }}>
          <i className="fa-solid fa-crown" />Developer
        </span>
      </div>

      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl border border-border">
        {TABS.map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all relative ${
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            <i className={`fa-solid ${t.icon} text-xs`} />
            <span className="hidden sm:inline">{t.label}</span>
            {!!t.badge && t.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-white text-xs flex items-center justify-center font-bold">
                {t.badge > 9 ? "9+" : t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {!loading && tab === "overview" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Users",      value: stats.totalUsers,       icon: "fa-users",            color: "text-blue-400",   bg: "bg-blue-400/10" },
              { label: "Premium",          value: stats.premiumUsers,     icon: "fa-crown",            color: "text-amber-400",  bg: "bg-amber-400/10" },
              { label: "Free",             value: stats.freeUsers,        icon: "fa-user",             color: "text-emerald-400",bg: "bg-emerald-400/10" },
              { label: "Pending Review",   value: stats.pendingStaggering,icon: "fa-triangle-exclamation",color: "text-red-400",  bg: "bg-red-400/10" },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-2xl p-5">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <i className={`fa-solid ${s.icon} ${s.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {staggering.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-amber-400" />
                <h2 className="text-sm font-semibold text-foreground">Recent Staggering Cases</h2>
                <span className="ml-auto text-xs text-muted-foreground">Needs your review</span>
              </div>
              <div className="divide-y divide-border">
                {staggering.slice(0, 5).map(c => (
                  <StaggeringRow key={c._id} c={c} actionLoading={actionLoading}
                    note={noteInputs[c._id] || ""}
                    onNoteChange={v => setNoteInputs(p => ({ ...p, [c._id]: v }))}
                    onApprove={() => handleApprove(c._id)}
                    onReject={() => handleReject(c._id)}
                    onImageClick={() => c.receiptImageUrl && setImageModal(c.receiptImageUrl)}
                    fmt={fmt} timeAgo={timeAgo}
                  />
                ))}
              </div>
              {stats.pendingStaggering > 5 && (
                <div className="px-5 py-3 border-t border-border">
                  <button onClick={() => handleTabChange("staggering")}
                    className="text-xs text-primary hover:underline">
                    View all {stats.pendingStaggering} pending cases →
                  </button>
                </div>
              )}
            </div>
          )}

          {staggering.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <i className="fa-solid fa-circle-check text-emerald-400 text-3xl mb-3" />
              <p className="text-sm font-medium text-foreground">No pending cases</p>
              <p className="text-xs text-muted-foreground mt-1">All staggering subscriptions have been reviewed.</p>
            </div>
          )}
        </div>
      )}

      {!loading && tab === "staggering" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Pending Staggering Premiums</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              These users got premium but we couldn't verify their receipt date or transaction ID. Review each one.
            </p>
          </div>
          {staggering.length === 0 ? (
            <div className="text-center py-14">
              <i className="fa-solid fa-circle-check text-emerald-400 text-3xl mb-3" />
              <p className="text-sm font-medium text-foreground">All clear — nothing to review!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {staggering.map(c => (
                <StaggeringRow key={c._id} c={c} actionLoading={actionLoading}
                  note={noteInputs[c._id] || ""}
                  onNoteChange={v => setNoteInputs(p => ({ ...p, [c._id]: v }))}
                  onApprove={() => handleApprove(c._id)}
                  onReject={() => handleReject(c._id)}
                  onImageClick={() => c.receiptImageUrl && setImageModal(c.receiptImageUrl)}
                  fmt={fmt} timeAgo={timeAgo}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "premium" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Premium Users ({premiumUsers.length})</h2>
          </div>
          {premiumUsers.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <p className="text-sm">No premium users yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {premiumUsers.map(u => (
                <div key={u._id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center">
                    {u.profilePicture
                      ? <img src={u.profilePicture} alt={u.name} className="w-full h-full object-cover" />
                      : <i className="fa-solid fa-user text-muted-foreground text-sm" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{u.name}</p>
                      {u.isAdmin && (
                        <span className="text-xs font-semibold text-amber-300 px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(251,191,36,0.15)" }}>Dev</span>
                      )}
                      {u.subscription?.isStaggering && (
                        <span className="text-xs font-semibold text-orange-300 px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(251,146,60,0.15)" }}>Staggering</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email || "No email"}</p>
                    <p className="text-xs text-muted-foreground/60">
                      {u.authProvider} · joined {fmt(u.createdAt)}
                      {u.premiumUntil && ` · expires ${fmt(u.premiumUntil)}`}
                    </p>
                  </div>
                  {!u.isAdmin && (
                    <button
                      onClick={() => handleRevoke(u._id, u.name)}
                      disabled={actionLoading === u._id + "_revoke"}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all disabled:opacity-50"
                    >
                      {actionLoading === u._id + "_revoke"
                        ? <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                        : <i className="fa-solid fa-ban text-xs" />}
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StaggeringRow({ c, actionLoading, note, onNoteChange, onApprove, onReject, onImageClick, fmt, timeAgo }: {
  c: StaggeringCase;
  actionLoading: string | null;
  note: string;
  onNoteChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onImageClick: () => void;
  fmt: (d: string) => string;
  timeAgo: (d: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center">
          {c.user?.profilePicture
            ? <img src={c.user.profilePicture} alt={c.user.name} className="w-full h-full object-cover" />
            : <i className="fa-solid fa-user text-muted-foreground text-sm" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{c.user?.name || "Unknown"}</p>
            <span className="text-xs font-semibold text-orange-300 px-1.5 py-0.5 rounded"
              style={{ background: "rgba(251,146,60,0.15)", border: "1px solid rgba(251,146,60,0.25)" }}>
              ⚠ Staggering
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{c.user?.email || "No email"} · {timeAgo(c.createdAt)}</p>
          {c.transactionId && (
            <p className="text-xs text-muted-foreground mt-0.5">
              <i className="fa-solid fa-hashtag mr-1" />TX: <code className="text-xs">{c.transactionId}</code>
            </p>
          )}
          {c.verificationNote && (
            <p className="text-xs text-muted-foreground/70 mt-1 italic">{c.verificationNote}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {c.receiptImageUrl && (
            <button onClick={onImageClick}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title="View receipt">
              <i className="fa-solid fa-image text-xs" />
            </button>
          )}
          <button onClick={() => setExpanded(p => !p)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <i className={`fa-solid fa-chevron-${expanded ? "up" : "down"} text-xs`} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Admin note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={e => onNoteChange(e.target.value)}
              placeholder="e.g. Receipt looks genuine, approving."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onApprove}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "rgba(52,211,153,0.85)" }}
            >
              {actionLoading === c._id + "_approve"
                ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <i className="fa-solid fa-circle-check text-xs" />}
              Approve
            </button>
            <button
              onClick={onReject}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: "rgba(239,68,68,0.8)" }}
            >
              {actionLoading === c._id + "_reject"
                ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <i className="fa-solid fa-circle-xmark text-xs" />}
              Reject & Revoke
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
