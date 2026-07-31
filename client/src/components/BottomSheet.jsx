import { useEffect, useRef, useState } from 'react';

const SNAP_POINTS = {
  half: '60vh',
  full: '92vh',
};

export default function BottomSheet({ open, onClose, children, title, initialSnap = 'half' }) {
  const sheetRef = useRef(null);
  const dragRef = useRef(null);
  const [snap, setSnap] = useState(initialSnap);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onTouchStart = (e) => {
    const t = e.touches[0];
    dragRef.current = { startY: t.clientY, currentY: t.clientY, baseHeight: SNAP_POINTS[snap] };
    setDragging(true);
  };

  const onTouchMove = (e) => {
    if (!dragRef.current) return;
    const t = e.touches[0];
    dragRef.current.currentY = t.clientY;
    const delta = dragRef.current.startY - t.clientY;
    if (sheetRef.current) {
      const basePx = parseFloat(dragRef.current.baseHeight);
      const newHeight = Math.max(120, Math.min(window.innerHeight * 0.95, basePx + delta));
      sheetRef.current.style.height = `${newHeight}px`;
    }
  };

  const onTouchEnd = () => {
    if (!dragRef.current || !sheetRef.current) return;
    const delta = dragRef.current.startY - dragRef.current.currentY;
    const heightPx = parseFloat(sheetRef.current.style.height);
    const vh = window.innerHeight;
    setDragging(false);
    if (delta < -100) {
      setSnap('full');
    } else if (delta > 100) {
      if (snap === 'full') {
        setSnap('half');
      } else {
        onClose();
        dragRef.current = null;
        return;
      }
    } else {
      const ratio = heightPx / vh;
      if (ratio < 0.3) {
        onClose();
        dragRef.current = null;
        return;
      } else if (ratio > 0.75) {
        setSnap('full');
      } else {
        setSnap('half');
      }
    }
    if (sheetRef.current) sheetRef.current.style.height = '';
    dragRef.current = null;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <div
        onClick={onClose}
        className={[
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      />
      <div
        ref={sheetRef}
        className={[
          'absolute bottom-0 left-0 right-0 glass-floating rounded-t-2xl flex flex-col overflow-hidden animate-slide-in-bottom',
          dragging ? '' : 'transition-[height] duration-200',
        ].join(' ')}
        style={{ height: SNAP_POINTS[snap] }}
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="shrink-0 pt-2 pb-3 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-white/5 shrink-0">
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
        <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
}
