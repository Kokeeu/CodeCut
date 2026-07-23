import VideoUploader from './VideoUploader.jsx';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FilePool({ files, onAddClip, onFilesAdded, vertical }) {
  if (vertical) {
    return (
      <div className="flex flex-col gap-2">
        {files.map((f) => (
          <div key={f.id} className="rounded-lg bg-editor-surface border border-editor-border overflow-hidden">
            <div className="flex gap-2 p-2">
              {f.thumbnail ? (
                <img src={f.thumbnail} alt={f.name} className="w-16 h-10 object-cover rounded" />
              ) : (
                <div className="w-16 h-10 bg-editor-border rounded flex items-center justify-center text-lg">🎞</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-neutral-300 truncate" title={f.name}>{f.name}</p>
                <p className="text-[9px] text-neutral-500 font-mono">{formatTime(f.duration)}</p>
                <button onClick={() => onAddClip(f.id)}
                  className="mt-1 w-full px-2 py-0.5 rounded bg-accent hover:bg-accent-hover text-[9px] font-medium transition-colors">
                  + Timeline
                </button>
              </div>
            </div>
          </div>
        ))}
        {files.length === 0 && (
          <p className="text-[10px] text-neutral-500 text-center py-4">No media yet</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {files.map((f) => (
        <div
          key={f.id}
          className="shrink-0 w-36 rounded-lg bg-editor-surface border border-editor-border overflow-hidden"
        >
          {f.thumbnail ? (
            <img src={f.thumbnail} alt={f.name} className="w-full h-20 object-cover" />
          ) : (
            <div className="w-full h-20 bg-editor-border flex items-center justify-center text-2xl">🎞</div>
          )}
          <div className="p-2">
            <p className="text-[11px] text-neutral-300 truncate" title={f.name}>{f.name}</p>
            <p className="text-[10px] text-neutral-500 font-mono">{formatTime(f.duration)}</p>
            <button
              onClick={() => onAddClip(f.id)}
              className="mt-1.5 w-full px-2 py-1 rounded bg-accent hover:bg-accent-hover text-[11px] font-medium transition-colors"
            >
              + Add to timeline
            </button>
          </div>
        </div>
      ))}
      <div className="shrink-0 flex items-center">
        <VideoUploader onFilesAdded={onFilesAdded} compact />
      </div>
    </div>
  );
}
