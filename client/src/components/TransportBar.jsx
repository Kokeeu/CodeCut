function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

export default function TransportBar({
  isPlaying, onPlayPause, onSplit, onDelete, onReset,
  currentOffset, totalDuration, clipsCount, canDelete,
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-editor-panel border-t border-editor-border shrink-0">
      <div className="flex items-center gap-1">
        <button onClick={onPlayPause}
          className="w-8 h-8 rounded-lg bg-accent hover:bg-accent-hover text-white flex items-center justify-center text-sm transition-colors">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button onClick={onSplit}
          className="w-8 h-8 rounded-lg bg-editor-surface hover:bg-editor-hover text-neutral-300 flex items-center justify-center text-sm transition-colors"
          title="Split (S)">
          ✂
        </button>
        <button onClick={onDelete} disabled={!canDelete}
          className="w-8 h-8 rounded-lg bg-editor-surface hover:bg-editor-hover text-neutral-300 flex items-center justify-center text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Delete clip">
          🗑
        </button>
        <button onClick={onReset}
          className="w-8 h-8 rounded-lg bg-editor-surface hover:bg-editor-hover text-neutral-300 flex items-center justify-center text-sm transition-colors"
          title="Reset project">
          ↺
        </button>
      </div>

      <div className="w-px h-5 bg-editor-border" />

      <div className="flex items-center gap-2 font-mono text-[11px]">
        <span className="text-neutral-300">{formatTime(currentOffset)}</span>
        <span className="text-neutral-600">/</span>
        <span className="text-neutral-500">{formatTime(totalDuration)}</span>
      </div>

      <div className="flex-1" />

      <div className="text-[10px] text-neutral-500">
        <span className="text-neutral-600">Space</span> play · <span className="text-neutral-600">S</span> split · <span className="text-neutral-600">←→</span> frame
      </div>
    </div>
  );
}
