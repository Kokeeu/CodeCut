import useToast from '../hooks/useToast.js';

function SuccessIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7v4M8 5v0.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5L15 14H1L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8 6v3.5M8 11.5v0.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const config = {
  success: {
    Icon: SuccessIcon,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
  },
  error: {
    Icon: ErrorIcon,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
  },
  info: {
    Icon: InfoIcon,
    color: 'text-accent',
    bg: 'bg-accent/10 border-accent/20',
  },
  warning: {
    Icon: WarningIcon,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
  },
};

function CloseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-[90] flex flex-col gap-2 max-w-[calc(100vw-24px)] sm:max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const { Icon, color, bg } = config[toast.type] || config.info;
        return (
          <div
            key={toast.id}
            className="pointer-events-auto glass-floating rounded-xl px-3 py-2.5 flex items-start gap-2.5 animate-toast-in shadow-panel-lg"
          >
            <div className={['shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border', bg, color].join(' ')}>
              <Icon />
            </div>
            <span className="flex-1 text-[12px] text-neutral-200 leading-relaxed pt-0.5">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 w-6 h-6 rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-white/5 transition-colors inline-flex items-center justify-center"
              aria-label="Dismiss"
            >
              <CloseIcon />
            </button>
          </div>
        );
      })}
    </div>
  );
}
