import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name,         setName]         = useState(user?.name ?? "");
  const [savingName,   setSavingName]   = useState(false);
  const [nameMsg,      setNameMsg]      = useState("");
  const [nameError,    setNameError]    = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true); setNameMsg(""); setNameError("");
    try {
      await api.patch("/users/profile", { name });
      await refreshUser();
      setNameMsg("Name updated successfully.");
      setTimeout(() => setNameMsg(""), 3000);
    } catch (err: any) {
      setNameError(err?.response?.data?.message || "Failed to update name.");
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append("avatar", f);
      await api.patch("/users/profile/picture", form, { headers: { "Content-Type": "multipart/form-data" } });
      await refreshUser();
    } catch { /* ignore */ } finally {
      setUploadingAvatar(false);
    }
  };

  const isPremium = user?.role === "premium";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account details.</p>
      </div>

      {/* Avatar + account info */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <i className="fa-solid fa-user text-2xl text-muted-foreground" />
            )}
          </div>
          <button
            data-testid="btn-change-avatar"
            onClick={() => avatarRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {uploadingAvatar ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <i className="fa-solid fa-camera text-white text-xs" />
            )}
          </button>
          <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-bold text-foreground">{user?.name}</h2>
            {isPremium ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-300 px-2.5 py-0.5 rounded-full"
                style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.28)" }}>
                <i className="fa-solid fa-crown" />Premium
              </span>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">Free</span>
            )}
          </div>
          {user?.email && <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>}
          {user?.authProvider && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <i className={`fa-brands fa-${user.authProvider === "google" ? "google" : user.authProvider === "github" ? "github" : "telegram"} text-xs`} />
              Signed in with {user.authProvider.charAt(0).toUpperCase() + user.authProvider.slice(1)}
            </p>
          )}
          {user?.createdAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Member since {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
            </p>
          )}
        </div>
      </div>

      {/* Update name */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Display Name</h2>
        <form onSubmit={handleNameSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Full name</label>
            <div className="relative">
              <i className="fa-solid fa-user absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none" />
              <input
                data-testid="input-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
          </div>
          {nameMsg   && <p className="text-sm text-emerald-400 flex items-center gap-1.5"><i className="fa-solid fa-check" />{nameMsg}</p>}
          {nameError && <p className="text-sm text-destructive flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation" />{nameError}</p>}
          <button
            data-testid="btn-save-name"
            type="submit"
            disabled={savingName || name.trim() === user?.name}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm"
            style={{ background: "hsl(217 91% 48%)" }}
          >
            {savingName ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><i className="fa-solid fa-floppy-disk" />Save Name</>}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Account</h2>
        <p className="text-xs text-muted-foreground">Your account is managed through your OAuth provider ({user?.authProvider ?? "social login"}). To change your email or password, visit your provider's settings.</p>
      </div>
    </div>
  );
}
