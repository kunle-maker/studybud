import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

interface NavItem {
  icon: string;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: "fa-house",           label: "Dashboard",      path: "/" },
  { icon: "fa-bolt",            label: "AI Summaries",   path: "/summaries" },
  { icon: "fa-chalkboard-user", label: "AI Teacher",     path: "/teacher" },
  { icon: "fa-lightbulb",       label: "Topic Explainer",path: "/topics" },
  { icon: "fa-camera",          label: "OCR Scanner",    path: "/ocr" },
  { icon: "fa-cards-blank",     label: "Flashcards",     path: "/flashcards" },
  { icon: "fa-circle-question", label: "Quiz",           path: "/quiz" },
  { icon: "fa-youtube",         label: "Video Search",   path: "/videos" },
];

const sidebarBg = {
  background: "rgba(5, 10, 30, 0.72)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  borderRight: "1px solid rgba(255,255,255,0.10)",
} as React.CSSProperties;

const headerBg = {
  background: "rgba(5, 10, 30, 0.70)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderBottom: "1px solid rgba(255,255,255,0.10)",
} as React.CSSProperties;

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isPremium = user?.role === "premium";

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={sidebarBg}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
            <i className="fa-solid fa-graduation-cap text-white text-sm" />
          </div>
          <span className="font-bold text-base text-white tracking-tight">StudyBud</span>
          <button className="ml-auto lg:hidden text-white/60 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item) => {
            const active = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all no-underline ${
                  active ? "text-white" : "text-white/65 hover:text-white"
                }`}
                style={active ? { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.12)" } : undefined}
              >
                <i className={`fa-solid ${item.icon} w-4 text-center`} />
                {item.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-300" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {!isPremium && (
            <Link
              href="/premium"
              data-testid="nav-upgrade-premium"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-amber-300 hover:text-amber-200 transition-all no-underline"
              style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}
            >
              <i className="fa-solid fa-crown w-4 text-center" />
              Upgrade to Premium
            </Link>
          )}
          {isPremium && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <i className="fa-solid fa-crown text-amber-400 text-sm" />
              <span className="text-amber-300 text-xs font-semibold">Premium Active</span>
            </div>
          )}
          <Link
            href="/profile"
            data-testid="nav-profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-all group no-underline"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <i className="fa-solid fa-user text-white/60 text-xs" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-white/45 truncate">{user?.email}</p>
            </div>
            <i className="fa-solid fa-chevron-right text-white/30 text-xs group-hover:text-white/60 transition-colors" />
          </Link>
          <button
            data-testid="btn-theme-toggle"
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"} w-4 text-center`} />
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            data-testid="btn-logout"
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            <i className="fa-solid fa-arrow-right-from-bracket w-4 text-center" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-10" style={headerBg}>
          <button data-testid="btn-mobile-menu" onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <i className="fa-solid fa-bars text-lg" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <i className="fa-solid fa-graduation-cap text-white text-xs" />
            </div>
            <span className="font-bold text-sm text-white">StudyBud</span>
          </div>
          <button
            data-testid="btn-theme-toggle-mobile"
            onClick={toggle}
            className="ml-auto p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle theme"
          >
            <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"} text-base`} />
          </button>
          {isPremium && (
            <span className="text-xs font-semibold text-amber-300 px-2 py-0.5 rounded-full"
              style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)" }}>
              <i className="fa-solid fa-crown mr-1" />Premium
            </span>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
