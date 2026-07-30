import { memo } from 'react';

const SHORTCUTS = [
  { category: 'Playback', shortcuts: [
    { keys: 'Space', action: 'Play/Pause' },
    { keys: 'J', action: 'Rewind faster' },
    { keys: 'K', action: 'Stop rewind' },
    { keys: 'L', action: 'Play faster' },
    { keys: '←', action: 'Step back 1 frame' },
    { keys: '→', action: 'Step forward 1 frame' },
  ]},
  { category: 'Editing', shortcuts: [
    { keys: 'S', action: 'Split clip at playhead' },
    { keys: 'Ctrl+Z', action: 'Undo' },
    { keys: 'Ctrl+Y', action: 'Redo' },
    { keys: 'Ctrl+Shift+Z', action: 'Redo' },
  ]},
  { category: 'Navigation', shortcuts: [
    { keys: '?', action: 'Show this help' },
    { keys: 'Esc', action: 'Close dialogs' },
  ]},
];

const ShortcutOverlay = memo(function ShortcutOverlay({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-editor-panel border border-editor-border rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-100">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-editor-surface hover:bg-editor-hover text-neutral-300 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SHORTCUTS.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-semibold text-accent mb-3">{category.category}</h3>
              <div className="flex flex-col gap-2">
                {category.shortcuts.map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-neutral-400">{shortcut.action}</span>
                    <kbd className="px-2 py-1 rounded bg-editor-surface border border-editor-border text-[10px] font-mono text-neutral-300">
                      {shortcut.keys}
                    </kbd>
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
