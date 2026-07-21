import VideoUploader from './VideoUploader.jsx';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function FilePool({ files, onAddClip, onFilesAdded }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {files.map((f) => (
        <div
          key={f.id}
          className="shrink-0 w-36 rounded-xl bg-slate-800/70 border border-slate-700 overflow-hidden"
        >
          {f.thumbnail ? (
            <img src={f.thumbnail} alt={f.name} className="w-full h-20 object-cover" />
          ) : (
            <div className="w-full h-20 bg-slate-700 flex items-center justify-center text-2xl">🎞</div>
          )}
          <div className="p-2">
            <p className="text-[11px] text-slate-300 truncate" title={f.name}>{f.name}</p>
            <p className="text-[10px] text-slate-500 font-mono">{formatTime(f.duration)}</p>
            <button
              onClick={() => onAddClip(f.id)}
              className="mt-1.5 w-full px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-[11px] font-medium"
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
