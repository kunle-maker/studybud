import { Link } from "wouter";

interface LimitBannerProps {
  feature?: string;
}

export default function LimitBanner({ feature }: LimitBannerProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
      style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.28)" }}>
      <i className="fa-solid fa-crown text-amber-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-semibold text-white">Daily limit reached{feature ? ` for ${feature}` : ""}</p>
        <p className="text-white/65 mt-0.5">Upgrade to Premium for unlimited access. Resets at midnight UTC.</p>
      </div>
      <Link
        href="/premium"
        className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors flex-shrink-0 no-underline"
        style={{ background: "rgba(251,191,36,0.55)", border: "1px solid rgba(251,191,36,0.4)" }}
      >
        Upgrade
      </Link>
    </div>
  );
}
