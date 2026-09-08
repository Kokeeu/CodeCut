import ExportButton from './ExportButton.jsx';
import ProjectIO from './ProjectIO.jsx';
import UndoRedoButtons from './UndoRedoButtons.jsx';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function LogoMark({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="0.48" stopColor="#1688ff" />
          <stop offset="1" stopColor="#0a66d8" />
        </linearGradient>
      </defs>
      <path d="M5 2h12l5 5v12a3 3 0 01-3 3H5a3 3 0 01-3-3V5a3 3 0 013-3z" fill="url(#logo-grad)" />
      <path d="M9 7.8l7.2 4.2L9 16.2V7.8z" fill="white" />
      <path d="M18.2 3.2l2.6 2.6-2.6 1.1V3.2z" fill="#ff2d78" />
    </svg>
  );
}

function IconButton({ onClick, title, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={[
        'inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-white/5',
        'transition-all duration-150 focus-ring disabled:opacity-30 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PanelLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 3v10" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function PanelRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 3v10" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export default function TopBar({
  files, clips, transitions, meta, totalDuration, onSave, onLoad,
  exportConfig, onExportConfigChange, canUndo, canRedo, onUndo, onRedo,
  onToggleLeftSidebar, onToggleRightSidebar,
  onToggleLeftCollapse, onToggleRightCollapse,
  leftCollapsed, rightCollapsed, hasFiles, autosaveStatus,
}) {
  return (
    <header className="h-16 studio-topbar backdrop-blur-xl border-b flex items-center px-3 sm:px-5 gap-2 sm:gap-3 shrink-0 relative z-30">
      {hasFiles && (
        <button
          onClick={onToggleLeftSidebar}
          className="xl:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-white/5 transition-colors"
          aria-label="Abrir biblioteca"
        >
          <HamburgerIcon />
        </button>
      )}

      <div className="flex items-center gap-2.5">
        <div className="relative">
          <LogoMark size={28} />
          <span className="absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full bg-signal border-2 border-editor-panel shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
        </div>
        <div className="hidden xs:flex sm:flex flex-col leading-none">
          <div className="flex items-baseline gap-1.5">
            <span className="display-font text-[13px] font-extrabold tracking-[0.08em] text-neutral-100">CODECUT</span>
            <span className="text-[9px] text-signal/80 font-mono tracking-[0.16em]">9:16</span>
          </div>
          <span className="mt-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-neutral-600">Estudio vertical</span>
        </div>
      </div>

      <div className="vdivider hidden sm:block" />

      <div className="hidden sm:block">
        <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
      </div>

      <div className="vdivider hidden md:block" />

      {hasFiles && (
        <div className="hidden md:flex items-center gap-1.5 text-[10px] text-neutral-400">
          <div className="px-2.5 py-1.5 rounded-lg bg-glass-panel border border-glass-border">
            <span className="text-neutral-500 uppercase tracking-wider">Medios</span>
            <span className="ml-1.5 font-mono text-neutral-100 font-semibold">{files.length}</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-glass-panel border border-glass-border">
            <span className="text-neutral-500 uppercase tracking-wider">Clips</span>
            <span className="ml-1.5 font-mono text-neutral-100 font-semibold">{clips.length}</span>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-accent/[0.08] border border-accent/20 font-mono text-signal font-semibold tabular-nums">
            {formatTime(totalDuration)}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {hasFiles && (
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-glass-panel border border-glass-border">
          <span className={['w-1.5 h-1.5 rounded-full', autosaveStatus === 'error' ? 'bg-red-400' : autosaveStatus === 'saved' ? 'bg-signal shadow-[0_0_7px_rgba(34,211,238,0.65)]' : 'bg-neutral-600'].join(' ')} />
          <span className="text-[9px] font-semibold text-neutral-500 uppercase tracking-wider">
            {autosaveStatus === 'error' ? 'Error al guardar' : autosaveStatus === 'saved' ? 'Guardado' : 'Autoguardado'}
          </span>
        </div>
      )}

      {hasFiles && (
        <div className="hidden xl:flex items-center gap-1">
          <IconButton
            onClick={onToggleLeftCollapse}
            title={leftCollapsed ? 'Abrir biblioteca' : 'Cerrar biblioteca'}
            className="w-8 h-8"
          >
            <PanelLeftIcon />
          </IconButton>
        </div>
      )}

      <div className="hidden sm:block">
        <ProjectIO onSave={onSave} onLoad={onLoad} compact />
      </div>

      {hasFiles && (
        <div className="hidden xl:flex items-center gap-1">
          <IconButton
            onClick={onToggleRightCollapse}
            title={rightCollapsed ? 'Abrir inspector' : 'Cerrar inspector'}
            className="w-8 h-8"
          >
            <PanelRightIcon />
          </IconButton>
        </div>
      )}

      <div className="vdivider hidden xl:block" />

      <ExportButton files={files} clips={clips} transitions={transitions} meta={meta} exportConfig={exportConfig} onExportConfigChange={onExportConfigChange} compact />

      {hasFiles && (
        <button
          onClick={onToggleRightSidebar}
          className="xl:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-white/5 transition-colors ml-1"
          aria-label="Abrir inspector"
        >
          <PanelRightIcon />
        </button>
      )}
    </header>
  );
}
