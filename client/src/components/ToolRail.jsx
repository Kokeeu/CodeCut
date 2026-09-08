const TOOLS = [
  {
    id: 'media',
    label: 'Medios',
    icon: (
      <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="4" width="15" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 13l4-3 3 2 3-2 5 3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="13.5" cy="8" r="1.25" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'text',
    label: 'Texto',
    icon: (
      <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
        <path d="M4 4.5h12M10 4.5v11M7.5 15.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'templates',
    label: 'Plantillas',
    icon: (
      <svg width="19" height="19" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="2.5" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
        <rect x="11.5" y="2.5" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2.5" y="11.5" width="6" height="6" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
        <path d="M14.5 11.5v6M11.5 14.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function ToolRail({ activeTool, panelOpen, onSelect }) {
  return (
    <nav className="tool-rail h-full w-[60px] flex flex-col items-center py-3 border-r border-glass-border shrink-0" aria-label="Herramientas del editor">
      <div className="w-8 h-px bg-gradient-to-r from-transparent via-signal/60 to-transparent mb-3" />
      <div className="flex flex-col gap-2">
        {TOOLS.map((tool) => {
          const active = activeTool === tool.id && panelOpen;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelect(tool.id)}
              aria-pressed={active}
              title={tool.label}
              className={[
                'group relative w-11 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 focus-ring',
                active
                  ? 'bg-accent/[0.12] text-signal border border-accent/25 shadow-glow-accent-sm'
                  : 'text-neutral-500 border border-transparent hover:text-neutral-200 hover:bg-white/[0.045]',
              ].join(' ')}
            >
              {tool.icon}
              <span className="text-[8px] font-semibold tracking-wide">{tool.label}</span>
              {active && <span className="absolute -left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-signal via-accent to-flare rounded-full animate-rail-scan" />}
            </button>
          );
        })}
      </div>
      <div className="flex-1" />
      <div className="flex flex-col items-center gap-1.5 text-[8px] font-mono text-neutral-700 uppercase tracking-[0.18em] [writing-mode:vertical-rl] rotate-180">
        <span>Estudio</span>
        <span className="h-5 w-px bg-flare/40" />
        <span>9:16</span>
      </div>
    </nav>
  );
}
