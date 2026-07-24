import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ClipBlock({ clip, index, width, file, isActive, canDelete, onSelect, onDelete, onDuplicate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${width}px`,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  const duration = clip.sourceEnd - clip.sourceStart;
  const waveform = file?.waveform;
  const filmstrip = file?.filmstrip;
  const fileDuration = file?.duration || 0;

  const filmstripStyle = useMemo(() => {
    if (!filmstrip || !duration || !fileDuration) return null;
    const ratio = fileDuration / duration;
    const bgWidth = width * ratio;
    const bgPos = -(clip.sourceStart / duration) * width;
    return {
      backgroundImage: `url(${filmstrip})`,
      backgroundSize: `${bgWidth}px 100%`,
      backgroundPositionX: `${bgPos}px`,
      backgroundRepeat: 'no-repeat',
    };
  }, [filmstrip, duration, fileDuration, width, clip.sourceStart]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={[
        'relative h-16 rounded-lg overflow-hidden cursor-pointer select-none border-2 shrink-0',
        isActive ? 'border-accent ring-2 ring-accent/20' : 'border-editor-border hover:border-neutral-600',
        'bg-editor-surface',
      ].join(' ')}
      title={file ? file.name : ''}
    >
      {filmstripStyle ? (
        <div style={filmstripStyle} className="absolute inset-0 opacity-60 pointer-events-none" />
      ) : file && file.thumbnail ? (
        <img src={file.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />
      
      {waveform && (
        <div className="absolute bottom-0 left-0 right-0 h-8 flex items-end gap-px px-1 pointer-events-none opacity-60">
          {waveform.map((peak, i) => (
            <div
              key={i}
              className="flex-1 bg-slate-400 rounded-t"
              style={{ height: `${Math.max(2, peak * 100)}%` }}
            />
          ))}
        </div>
      )}
      
      <div className="absolute top-1 left-1.5 text-[10px] font-mono text-slate-200 bg-black/50 px-1 rounded">
        #{index + 1}
      </div>
      <div className="absolute bottom-1 left-1.5 text-[10px] font-mono text-slate-100 bg-black/50 px-1 rounded">
        {formatTime(duration)}
      </div>
      {clip.speed && clip.speed !== 1 && (
        <div className="absolute bottom-1 right-1 text-[9px] font-mono text-yellow-300 bg-black/60 px-1 rounded">
          {clip.speed}x
        </div>
      )}
      {canDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-1 right-1 w-5 h-5 rounded bg-black/60 hover:bg-red-600 text-[11px] leading-none text-slate-200"
          title="Delete clip"
        >
          ×
        </button>
      )}
      {isActive && (
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate?.(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-1 right-7 w-5 h-5 rounded bg-black/60 hover:bg-accent text-[11px] leading-none text-slate-200"
          title="Duplicate clip"
        >
          ⧉
        </button>
      )}
    </div>
  );
}
