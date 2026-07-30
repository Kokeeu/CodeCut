import { memo } from 'react';

const UndoRedoButtons = memo(function UndoRedoButtons({ canUndo, canRedo, onUndo, onRedo }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="w-8 h-8 rounded-lg bg-editor-surface hover:bg-editor-hover text-neutral-300 flex items-center justify-center text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="w-8 h-8 rounded-lg bg-editor-surface hover:bg-editor-hover text-neutral-300 flex items-center justify-center text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Y)"
      >
        ↷
      </button>
    </div>
  );
});

export default UndoRedoButtons;
