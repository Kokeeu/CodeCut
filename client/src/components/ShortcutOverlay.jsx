import { memo, useEffect } from 'react';

const SHORTCUTS = [
  { category: 'Playback', shortcuts: [
    { keys: ['Space'], action: 'Play / Pause' },
    { keys: ['J'], action: 'Rewind faster' },
    { keys: ['K'], action: 'Stop rewind' },
    { keys: ['L'], action: 'Play faster' },
    { keys: ['←'], action: 'Step back 1 frame' },
    { keys: ['→'], action: 'Step forward 1 frame' },
  ]},
  { category: 'Editing', shortcuts: [
    { keys: ['S'], action: 'Split clip at playhead' },
    { keys: ['Ctrl', 'Z'], action: 'Undo' },
    { keys: ['Ctrl', 'Y'], action: 'Redo' },
    { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
  ]},
  { category: 'Other', shortcuts: [
    { keys: ['?'], action: 'Show this help' },
    { keys: ['Esc'], action: 'Close dialogs' },
  ]},
];

function KbdGroup({ keys }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <kbd className="kbd">{k}</kbd>
          {i < keys.length - 1 && <span className="text-neutral-600 text-[10px]">+</span>}
        </span>
      ))}
    </span>
  );
}

const ShortcutOverlay = memo(function ShortcutOverlay({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative glass-floating rounded-2xl p-6 max-w-2xl w-full mx-4 animate-scale-in shadow-panel-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-neutral-100">Keyboard shortcuts</h2>
            <p className="text-[11px] text-neutral-500 mt-0.5">Press <kbd className="kbd">?</kbd> anytime to toggle this</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-all duration-150 focus-ring inline-flex items-center justify-center"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {SHORTCUTS.map((category) => (
            <div key={category.category}>
              <h3 className="text-[10px] font-semibold text-gradient-accent uppercase tracking-wider mb-2.5">
                {category.category}
              </h3>
              <div className="flex flex-col gap-1">
                {category.shortcuts.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="text-[11px] text-neutral-300">{shortcut.action}</span>
                    <KbdGroup keys={shortcut.keys} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default ShortcutOverlay;
