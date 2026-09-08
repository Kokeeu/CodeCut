import { useEffect, useRef, useState } from 'react';
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from '../lib/timelineScale.js';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
  const minutes = Math.floor(seconds / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${minutes.toString().padStart(2, '0')}:${wholeSeconds.toString().padStart(2, '0')}.${tenths}`;
}

function PlayIcon({ paused }) {
  return paused ? (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor"><path d="M4 2.6l8.2 4.9L4 12.4V2.6z" /></svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor"><rect x="3.5" y="2.5" width="2.7" height="10" rx="0.6" /><rect x="8.8" y="2.5" width="2.7" height="10" rx="0.6" /></svg>
  );
}

function SplitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="3" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.2" /><circle cx="3" cy="9.5" r="1.5" stroke="currentColor" strokeWidth="1.2" /><path d="M4.5 4.8L11 7M4.5 9.2L11 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 3.5h9M5 3.5V2.2h3v1.3M3.2 3.5l.5 7h5.6l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PanelIcon({ side }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d={side === 'left' ? 'M5 2v10' : 'M9 2v10'} stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function ToolButton({ onClick, disabled, title, children, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={[
        'w-8 h-8 rounded-lg inline-flex items-center justify-center border border-transparent transition-colors focus-ring',
        danger ? 'text-neutral-500 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/15' : 'text-neutral-500 hover:text-neutral-100 hover:bg-white/5 hover:border-glass-border',
        'disabled:opacity-30 disabled:pointer-events-none',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function TransportBar({
  isPlaying,
  onPlayPause,
  onSplit,
  onDelete,
  onReset,
  currentOffset,
  totalDuration,
  clipsCount,
  canDelete,
  onOpenProperties,
  onOpenMedia,
  timelineZoom,
  onTimelineZoomChange,
}) {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    if (!showMore) return undefined;
    const close = (event) => {
      if (!moreRef.current?.contains(event.target)) setShowMore(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [showMore]);

  return (
    <div className="h-12 px-2.5 flex items-center gap-2 border-b border-glass-border bg-editor-panel/80 shrink-0">
      <div className="flex items-center gap-1 min-w-0">
        <ToolButton onClick={onOpenMedia} title="Abrir medios"><PanelIcon side="left" /></ToolButton>
        <div className="hidden sm:block min-w-16 mr-1">
          <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-neutral-500">Línea de tiempo</div>
          <div className="text-[9px] font-mono text-neutral-600">{clipsCount} {clipsCount === 1 ? 'clip' : 'clips'}</div>
        </div>
        <span className="hidden sm:block vdivider" />
        <ToolButton onClick={onSplit} title="Dividir clip (S)"><SplitIcon /></ToolButton>
        <ToolButton onClick={onDelete} disabled={!canDelete} title="Eliminar clip" danger><TrashIcon /></ToolButton>
      </div>

      <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onPlayPause}
          title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
          className="w-10 h-10 rounded-xl inline-flex items-center justify-center bg-gradient-to-br from-signal via-accent to-accent-dim text-white shadow-glow-accent-sm hover:shadow-glow-accent hover:scale-105 transition-all focus-ring"
        >
          <PlayIcon paused={!isPlaying} />
        </button>
        <div className="hidden sm:flex items-baseline gap-1.5 font-mono tabular-nums whitespace-nowrap">
          <span className="text-[12px] font-semibold text-signal">{formatTime(currentOffset)}</span>
          <span className="text-[9px] text-neutral-700">/</span>
          <span className="text-[10px] text-neutral-500">{formatTime(totalDuration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 min-w-0">
        <div className="hidden md:flex items-center gap-1.5 w-32 lg:w-40">
          <span className="text-[9px] font-mono text-neutral-600">−</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            value={timelineZoom}
            onChange={(event) => onTimelineZoomChange?.(Number(event.target.value))}
            className="flex-1"
            aria-label="Zoom de la línea de tiempo"
          />
          <span className="text-[9px] font-mono text-neutral-500 w-7 text-right">{timelineZoom.toFixed(1)}×</span>
        </div>
        <ToolButton onClick={onOpenProperties} title="Abrir inspector"><PanelIcon side="right" /></ToolButton>
        <div ref={moreRef} className="relative">
          <ToolButton onClick={() => setShowMore((open) => !open)} title="Más acciones">•••</ToolButton>
          {showMore && (
            <div className="absolute right-0 bottom-full mb-2 w-44 p-1.5 glass-floating rounded-xl z-50 animate-slide-up">
              <button
                type="button"
                onClick={() => { setShowMore(false); onReset(); }}
                className="w-full px-2.5 py-2 rounded-lg text-left text-[11px] text-red-300 hover:bg-red-500/10 transition-colors"
              >
                Reiniciar proyecto
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
