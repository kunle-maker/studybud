interface UsageBarProps {
  label: string;
  icon: string;
  used: number;
  limit: number;
  isPremium?: boolean;
}

export default function UsageBar({ label, icon, used, limit, isPremium }: UsageBarProps) {
  const pct = isPremium ? 0 : Math.min(100, (used / limit) * 100);
  const remaining = limit - used;
  const isExhausted = !isPremium && used >= limit;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <i className={`fa-solid ${icon} text-primary text-xs w-3.5 text-center`} />
          {label}
        </div>
        {isPremium ? (
          <span className="text-xs text-emerald-400 font-semibold">Unlimited</span>
        ) : (
          <span className={`text-xs font-semibold ${isExhausted ? "text-destructive" : "text-muted-foreground"}`}>
            {used}/{limit}
          </span>
        )}
      </div>
      {!isPremium && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isExhausted ? "bg-destructive" : pct > 70 ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {!isPremium && (
        <p className={`text-[11px] ${isExhausted ? "text-destructive" : "text-muted-foreground"}`}>
          {isExhausted ? "Daily limit reached" : `${remaining} remaining today`}
        </p>
      )}
    </div>
  );
}
