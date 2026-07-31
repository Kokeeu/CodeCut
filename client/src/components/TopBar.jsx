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
          <stop offset="0" stopColor="#c084fc" />
          <stop offset="0.5" stopColor="#a855f7" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#logo-grad)" />
      <path d="M9 8.5l7 3.5-7 3.5V8.5z" fill="white" />
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
  leftCollapsed, rightCollapsed, hasFiles,
}) {
  return (
    <header className="h-14 bg-editor-panel/60 backdrop-blur-xl border-b border-glass-border flex items-center px-3 sm:px-4 gap-2 sm:gap-3 shrink-0 relative z-30">
      {hasFiles && (
        <button
          onClick={onToggleLeftSidebar}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-white/5 transition-colors"
          aria-label="Open menu"
        >
          <HamburgerIcon />
        </button>
      )}

      <div className="flex items-center gap-2">
        <LogoMark size={24} />
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold tracking-tight text-neutral-100 hidden xs:inline sm:inline">Codecut</span>
          <span className="text-[10px] text-neutral-500 font-mono tracking-wider hidden sm:inline">9:16</span>
        </div>
      </div>

      <div className="vdivider hidden sm:block" />

      <div className="hidden sm:block">
        <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
      </div>

      <div className="vdivider hidden md:block" />

      {hasFiles && (
        <div className="hidden md:flex items-center gap-1.5 text-[11px] text-neutral-400">
          <div className="px-2 py-1 rounded-md bg-glass-panel border border-glass-border">
            <span className="text-neutral-500">videos</span>
            <span className="ml-1.5 font-mono text-neutral-200 font-medium">{files.length}</span>
          </div>
          <div className="px-2 py-1 rounded-md bg-glass-panel border border-glass-border">
            <span className="text-neutral-500">clips</span>
            <span className="ml-1.5 font-mono text-neutral-200 font-medium">{clips.length}</span>
          </div>
          <div className="px-2 py-1 rounded-md bg-glass-panel border border-glass-border font-mono text-neutral-200 font-medium">
            {formatTime(totalDuration)}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {hasFiles && (
        <div className="hidden md:flex items-center gap-1">
          <IconButton
            onClick={onToggleLeftCollapse}
            title={leftCollapsed ? 'Expand media panel' : 'Collapse media panel'}
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
        <div className="hidden lg:flex items-center gap-1">
          <IconButton
            onClick={onToggleRightCollapse}
            title={rightCollapsed ? 'Expand properties' : 'Collapse properties'}
            className="w-8 h-8"
          >
            <PanelRightIcon />
          </IconButton>
        </div>
      )}

      <div className="vdivider hidden lg:block" />

      <ExportButton files={files} clips={clips} transitions={transitions} meta={meta} exportConfig={exportConfig} onExportConfigChange={onExportConfigChange} compact />

      {hasFiles && (
        <button
          onClick={onToggleRightSidebar}
          className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-white/5 transition-colors ml-1"
          aria-label="Open properties"
        >
          <PanelRightIcon />
        </button>
      )}
    </header>
  );
}
