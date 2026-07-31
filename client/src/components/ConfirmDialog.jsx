import { useEffect, useRef } from 'react';

function WarningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2L18 17H2L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 8v4M10 14v0.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9v5M10 6v0.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'danger' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter' && e.target === document.body) onConfirm?.();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onCancel, onConfirm]);

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  const isDanger = variant === 'danger';
  const Icon = isDanger ? WarningIcon : InfoIcon;
  const iconColor = isDanger ? 'text-red-400' : 'text-accent';
  const iconBg = isDanger ? 'bg-red-500/10 border-red-500/20' : 'bg-accent/10 border-accent/20';
  const confirmClass = isDanger
    ? 'bg-red-600 hover:bg-red-500 text-white border-red-500/40'
    : 'bg-gradient-to-br from-accent to-accent-dim text-white border-accent/30 shadow-glow-accent-sm hover:shadow-glow-accent';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative glass-floating rounded-2xl p-5 w-full max-w-sm mx-4 outline-none animate-scale-in shadow-panel-lg"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className={['shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border', iconBg, iconColor].join(' ')}>
            <Icon />
          </div>
          <div className="flex-1 min-w-0">
            {title && <h3 className="text-sm font-semibold text-neutral-100 mb-1 text-balance">{title}</h3>}
            {message && <p className="text-xs text-neutral-400 leading-relaxed text-balance">{message}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg bg-glass-panel border border-glass-border hover:border-white/20 text-neutral-200 text-xs font-medium transition-all duration-150 focus-ring"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={['px-3.5 py-2 rounded-lg border text-xs font-semibold transition-all duration-150 focus-ring', confirmClass].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
