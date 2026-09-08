function GuidesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 1.5v11M9 1.5v11M1.5 5h11M1.5 9h11" stroke="currentColor" strokeWidth="1" opacity="0.55" />
    </svg>
  );
}

export default function CanvasWorkspace({
  children,
  activeFileName,
  activeClipIndex,
  clipsCount,
  showGuides,
  onToggleGuides,
}) {
  const clipLabel = activeClipIndex >= 0 ? `Clip ${activeClipIndex + 1} de ${clipsCount}` : 'Sin clip seleccionado';

  return (
    <section className="flex-1 min-h-0 flex flex-col bg-editor-bg overflow-hidden">
      <div className="h-11 flex items-center gap-3 px-3 sm:px-4 border-b border-glass-border bg-editor-panel/70 backdrop-blur-md shrink-0">
        <div className="min-w-0 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_9px_rgba(34,211,238,0.8)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Lienzo</span>
          <span className="text-neutral-700">/</span>
          <span className="text-[11px] text-neutral-300 truncate max-w-[30vw]" title={activeFileName || ''}>{activeFileName || 'Proyecto sin título'}</span>
        </div>
        <div className="flex-1" />
        <span className="hidden sm:inline text-[10px] font-mono text-neutral-500">{clipLabel}</span>
        <button
          type="button"
          onClick={onToggleGuides}
          aria-pressed={showGuides}
          className={[
            'h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 border transition-colors focus-ring',
            showGuides
              ? 'bg-accent/[0.12] border-accent/30 text-signal'
              : 'bg-glass-panel border-glass-border text-neutral-500 hover:text-neutral-200 hover:border-glass-border-strong',
          ].join(' ')}
          title="Mostrar u ocultar guías"
        >
          <GuidesIcon />
          <span className="hidden sm:inline text-[9px] font-semibold uppercase tracking-wider">Guías</span>
        </button>
        <span className="h-8 px-2.5 rounded-lg inline-flex items-center border border-glass-border bg-glass-panel text-[10px] font-mono font-semibold text-neutral-300">1080 × 1920</span>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden relative canvas-stage">
        <div className="absolute left-5 top-5 w-10 h-px bg-gradient-to-r from-flare/70 to-transparent pointer-events-none" />
        <div className="absolute right-5 bottom-5 w-10 h-px bg-gradient-to-l from-signal/70 to-transparent pointer-events-none" />
        {children}
      </div>
    </section>
  );
}
