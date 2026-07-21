import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ClipBlock({ clip, index, width, file, isActive, canDelete, onSelect, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${width}px`,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  const duration = clip.sourceEnd - clip.sourceStart;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={[
        'relative h-20 rounded-lg overflow-hidden cursor-pointer select-none border-2 shrink-0',
        isActive ? 'border-indigo-400 ring-2 ring-indigo-500/30' : 'border-slate-700 hover:border-slate-500',
        'bg-slate-800',
      ].join(' ')}
      title={file ? file.name : ''}
    >
      {file && file.thumbnail ? (
        <img src={file.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />
      <div className="absolute top-1 left-1.5 text-[10px] font-mono text-slate-200 bg-black/50 px-1 rounded">
        #{index + 1}
      </div>
      <div className="absolute bottom-1 left-1.5 text-[10px] font-mono text-slate-100 bg-black/50 px-1 rounded">
        {formatTime(duration)}
      </div>
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
    </div>
  );
}
