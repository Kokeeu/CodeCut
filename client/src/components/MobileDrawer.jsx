import { useEffect, useRef } from 'react';

export default function MobileDrawer({ open, onClose, side = 'left', children, title, width = 'w-72' }) {
  const drawerRef = useRef(null);
  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const currentTranslateRef = useRef(0);

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

  const onTouchStart = (e) => {
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    currentTranslateRef.current = 0;
  };

  const onTouchMove = (e) => {
    if (startXRef.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = Math.abs(t.clientY - startYRef.current);
    if (dy > 30) return;
    const close = side === 'left' ? dx < 0 : dx > 0;
    if (!close) return;
    const clamped = side === 'left' ? Math.max(dx, -100) : Math.min(dx, 100);
    currentTranslateRef.current = clamped;
    if (drawerRef.current) {
      drawerRef.current.style.transform = `translateX(${clamped}px)`;
    }
  };

  const onTouchEnd = () => {
    const moved = currentTranslateRef.current;
    const shouldClose = (side === 'left' && moved < -60) || (side === 'right' && moved > 60);
    if (drawerRef.current) drawerRef.current.style.transform = '';
    if (shouldClose) onClose();
    startXRef.current = null;
    startYRef.current = null;
  };

  const slideClass = side === 'left' ? 'left-0' : 'right-0';
  const enterClass = side === 'left' ? 'animate-slide-in-left' : 'animate-slide-in-right';

  return (
    <div
      className={[
        'fixed inset-0 z-[100] md:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      ].join(' ')}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={[
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
      <div
        ref={drawerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={[
          'absolute top-0 bottom-0',
          width,
          slideClass,
          'glass-floating flex flex-col overflow-hidden',
          open ? enterClass : '',
        ].join(' ')}
        style={{ animationFillMode: 'forwards' }}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
            <h2 className="text-sm font-semibold text-neutral-100">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-colors"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
