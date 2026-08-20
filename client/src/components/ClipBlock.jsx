import { useMemo, memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M2 3h8M4.5 3V2a1 1 0 011-1h1a1 1 0 011 1v1M3 3l.5 7a1 1 0 001 1h3a1 1 0 001-1L9 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 7V3a1 1 0 011-1h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const ClipBlock = memo(function ClipBlock({ clip, index, width, file, isActive, canDelete, onSelect, onDelete, onDuplicate, overlapLeft = 0, overlapRight = 0 }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: clip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${width}px`,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 30 : undefined,
  };

  const duration = clip.sourceEnd - clip.sourceStart;
  const waveform = file?.waveform;
  const filmstrip = file?.filmstrip;
  const fileDuration = file?.duration || 0;
  const texts = clip.texts || [];

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
        'relative h-20 rounded-xl overflow-hidden cursor-pointer select-none border-2 shrink-0',
        'transition-all duration-150 group',
        isActive
          ? 'border-accent shadow-glow-accent ring-1 ring-accent/30'
          : 'border-glass-border hover:border-white/30 hover:-translate-y-0.5',
        'bg-glass-panel',
      ].join(' ')}
      title={file ? file.name : ''}
    >
      {overlapLeft > 2 && (
        <div
          className="absolute top-0 bottom-0 left-0 pointer-events-none z-[5]"
          style={{ width: overlapLeft, background: 'linear-gradient(90deg, rgba(168,85,247,0.4), transparent)' }}
        />
      )}
      {overlapRight > 2 && (
        <div
          className="absolute top-0 bottom-0 right-0 pointer-events-none z-[5]"
          style={{ width: overlapRight, background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.4))' }}
        />
      )}
      {filmstripStyle ? (
        <div style={filmstripStyle} className="absolute inset-0 opacity-70 pointer-events-none" />
      ) : file && file.thumbnail ? (
        <img src={file.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-glass-panel to-glass-strong pointer-events-none" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40 pointer-events-none" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/[0.04] rounded-xl pointer-events-none" />

      {waveform && (
        <div className="absolute bottom-0 left-0 right-0 h-10 flex items-end gap-px px-1.5 pointer-events-none opacity-80">
          {waveform.map((peak, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${Math.max(8, peak * 100)}%`,
                background: isActive
                  ? 'linear-gradient(to top, rgba(168,85,247,0.7), rgba(192,132,252,0.9))'
                  : 'linear-gradient(to top, rgba(148,163,184,0.5), rgba(203,213,225,0.7))',
              }}
            />
          ))}
        </div>
      )}

      {texts.length > 0 && (
        <div className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent/30 border border-accent/40 text-[9px] font-mono font-semibold text-white backdrop-blur-sm">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 2h6M4 2v5M2 7h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
          {texts.length}
        </div>
      )}

      <div className="absolute top-1.5 right-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono font-semibold text-white border border-white/10">
        #{index + 1}
      </div>

      {clip.speed && clip.speed !== 1 && (
        <div className="absolute bottom-1.5 right-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-yellow-400/20 border border-yellow-400/40 text-[10px] font-mono font-semibold text-yellow-300 backdrop-blur-sm">
          {clip.speed}×
        </div>
      )}

      <div className="absolute bottom-1.5 left-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-mono text-white border border-white/10">
        {formatTime(duration)}
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 pointer-events-none">
        {isActive && (
          <>
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto w-7 h-7 rounded-lg bg-red-500/90 hover:bg-red-500 backdrop-blur-md text-white flex items-center justify-center transition-colors border border-red-400/30 shadow-panel"
                title="Delete clip"
              >
                <TrashIcon />
              </button>
            )}
            {onDuplicate && (
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-auto w-7 h-7 rounded-lg bg-accent/90 hover:bg-accent backdrop-blur-md text-white flex items-center justify-center transition-colors border border-accent/30 shadow-panel"
                title="Duplicate clip"
              >
                <DuplicateIcon />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

export default ClipBlock;
