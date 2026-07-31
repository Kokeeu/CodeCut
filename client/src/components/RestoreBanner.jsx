import { useEffect, useState } from 'react';

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function RestoreBanner({ onRestore, onDismiss, hasData }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasData) setVisible(true);
  }, [hasData]);

  if (!visible) return null;

  return (
    <div className="bg-gradient-to-r from-accent/[0.08] via-accent/[0.06] to-transparent border-b border-accent/20 backdrop-blur-md animate-slide-down">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 text-accent flex items-center justify-center">
          <ClockIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-neutral-100 font-medium">Saved project found</p>
          <p className="text-[10px] text-neutral-400 leading-tight">Restore your previous work or start fresh</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => { onRestore(); setVisible(false); }}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-[11px] font-semibold transition-all duration-150 shadow-glow-accent-sm"
          >
            Restore
          </button>
          <button
            onClick={() => { onDismiss(); setVisible(false); }}
            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-glass-panel border border-glass-border hover:border-white/20 text-neutral-300 text-[11px] font-medium transition-all duration-150"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
