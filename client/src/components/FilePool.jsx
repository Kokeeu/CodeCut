import VideoUploader from './VideoUploader.jsx';
import LazyImage from './LazyImage.jsx';
import { MAX_MEDIA_FILES } from '../lib/mediaImport.js';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 8l4 2-4 2V8z" fill="currentColor" />
    </svg>
  );
}

export default function FilePool({ files, onAddClip, onFilesAdded, vertical }) {
  if (vertical) {
    return (
      <div className="flex flex-col gap-1.5">
        {files.map((f) => (
          <div
            key={f.id}
            className="group rounded-xl bg-glass-panel border border-glass-border overflow-hidden card-hover"
          >
            <div className="flex gap-2 p-1.5">
              {f.thumbnail ? (
                <LazyImage
                  src={f.thumbnail}
                  alt={f.name}
                  className="w-16 h-10 rounded-lg overflow-hidden shrink-0"
                />
              ) : (
                <div className="w-16 h-10 bg-glass-strong rounded-lg flex items-center justify-center text-neutral-500 shrink-0">
                  <VideoIcon />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <p className="text-[11px] text-neutral-200 font-medium truncate" title={f.name}>
                  {f.name}
                </p>
                <p className="text-[10px] text-neutral-500 font-mono tracking-tight">
                  {f._pending ? 'Needs re-upload' : formatTime(f.duration)}
                </p>
                <button
                  onClick={() => onAddClip(f.id)}
                  disabled={!!f._pending || !f.duration}
                  className="inline-flex items-center justify-center gap-1 w-full px-2 py-1 rounded-md bg-accent/15 border border-accent/20 text-accent text-[10px] font-semibold hover:bg-accent/25 hover:border-accent/40 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <PlusIcon />
                  {f._pending ? 'Re-upload' : 'Timeline'}
                </button>
              </div>
            </div>
          </div>
        ))}
        {files.length === 0 && (
          <div className="p-4 rounded-xl bg-glass-panel border border-dashed border-glass-border text-center">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              No media yet. Add videos to start your project.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
      {files.map((f) => (
        <div
          key={f.id}
          className="shrink-0 w-36 rounded-xl bg-glass-panel border border-glass-border overflow-hidden card-hover"
        >
          {f.thumbnail ? (
            <LazyImage
              src={f.thumbnail}
              alt={f.name}
              className="w-full h-20 overflow-hidden"
            />
          ) : (
            <div className="w-full h-20 bg-glass-strong flex items-center justify-center text-neutral-500">
              <VideoIcon />
            </div>
          )}
          <div className="p-2">
            <p className="text-[11px] text-neutral-200 truncate" title={f.name}>{f.name}</p>
            <p className="text-[10px] text-neutral-500 font-mono">{f._pending ? 'Needs re-upload' : formatTime(f.duration)}</p>
            <button
              onClick={() => onAddClip(f.id)}
              disabled={!!f._pending || !f.duration}
              className="mt-1.5 inline-flex items-center justify-center gap-1 w-full px-2 py-1 rounded-md bg-accent/15 border border-accent/20 text-accent text-[11px] font-semibold hover:bg-accent/25 hover:border-accent/40 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlusIcon />
              {f._pending ? 'Re-upload' : 'Add to timeline'}
            </button>
          </div>
        </div>
      ))}
      <div className="shrink-0 flex items-center">
        <VideoUploader onFilesAdded={onFilesAdded} remainingSlots={MAX_MEDIA_FILES - files.length} compact />
      </div>
    </div>
  );
}
