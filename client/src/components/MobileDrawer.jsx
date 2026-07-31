import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function MobileDrawer({ open, onClose, side = 'left', children, title, width = 'w-[85vw] max-w-xs' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const slideClass = side === 'left' ? 'animate-slide-in-left left-0' : 'animate-slide-in-right right-0';

  return createPortal(
    <div className="fixed inset-0 z-[200] md:hidden">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />
      <div
        className={[
          'absolute top-0 bottom-0',
          width,
          slideClass,
          'glass-floating flex flex-col overflow-hidden',
        ].join(' ')}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border shrink-0">
            <h2 className="text-sm font-semibold text-neutral-100">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-colors focus-ring"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
