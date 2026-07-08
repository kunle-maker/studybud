import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  assignment: { icon: "fa-clipboard-list", color: "text-violet-400" },
  grade:      { icon: "fa-star",           color: "text-yellow-400" },
  roadmap:    { icon: "fa-map",            color: "text-blue-400"   },
  mention:    { icon: "fa-at",             color: "text-teal-400"   },
  join:       { icon: "fa-user-plus",      color: "text-green-400"  },
  info:       { icon: "fa-circle-info",    color: "text-sky-400"    },
};

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [markingAll, setMarkingAll]       = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/notifications?limit=50")
      .then(r => setNotifications(r.data.data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch("/notifications/read-all");
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
    setMarkingAll(false);
  };

  const markOne = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const deleteOne = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch {}
  };

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
          {unread > 0 && <p className="text-xs text-muted-foreground mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} disabled={markingAll}
            className="text-xs text-primary hover:opacity-80 transition-opacity disabled:opacity-50">
            {markingAll ? "Marking…" : "Mark all read"}
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse">
              <div className="h-3 bg-muted rounded w-1/3 mb-2" />
              <div className="h-2.5 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <i className="fa-solid fa-bell-slash text-3xl text-muted-foreground/40 mb-4 block" />
          <p className="text-sm font-semibold text-foreground">All caught up</p>
          <p className="text-xs text-muted-foreground mt-1">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const meta = TYPE_ICONS[n.type] ?? TYPE_ICONS.info;
            return (
              <div key={n._id}
                className={`flex gap-3 p-4 rounded-2xl border transition-all duration-150 group ${
                  n.read ? "border-border bg-card" : "border-primary/15 bg-primary/5"
                }`}>
                <div className={`w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <i className={`fa-solid ${meta.icon} ${meta.color} text-xs`} />
                </div>
                <div className="flex-1 min-w-0" onClick={() => !n.read && markOne(n._id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${n.read ? "text-foreground/80" : "text-foreground"}`}>
                      {n.title}
                    </p>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{relativeTime(n.createdAt)}</p>
                </div>
                <button
                  onClick={() => deleteOne(n._id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex-shrink-0">
                  <i className="fa-solid fa-xmark text-xs" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
