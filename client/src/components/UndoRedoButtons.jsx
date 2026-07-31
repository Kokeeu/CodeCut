import { memo } from 'react';

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7h7a2.5 2.5 0 010 5H7M3 7l3-3M3 7l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M11 7H4a2.5 2.5 0 000 5h3M11 7L8 4M11 7L8 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const UndoRedoButtons = memo(function UndoRedoButtons({ canUndo, canRedo, onUndo, onRedo }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400"
      >
        <UndoIcon />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-white/5 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neutral-400"
      >
        <RedoIcon />
      </button>
    </div>
  );
});

export default UndoRedoButtons;
