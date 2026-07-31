function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M3.5 2.5l8 4.5-8 4.5v-9z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="3" y="2.5" width="2.5" height="9" rx="0.5" />
      <rect x="8.5" y="2.5" width="2.5" height="9" rx="0.5" />
    </svg>
  );
}

function SplitIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="3" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="3" cy="9" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 5L9.5 7M4.5 9L9.5 7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
      <path d="M2 3h8M4.5 3V2a1 1 0 011-1h1a1 1 0 011 1v1M3 3l.5 7a1 1 0 001 1h3a1 1 0 001-1L9 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 5.5A5 5 0 1111.5 7M2 5.5V2.5M2 5.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GuidesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 2v10M9 2v10M2 5h10M2 9h10" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

function MediaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 9l3-2 2 1.5 2-1.5 4 2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function PropertiesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 1.5h5M3 4.5h8M3 7.5h6M3 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="11" cy="10.5" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function TransportButton({ onClick, disabled, title, active, children, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={[
        'inline-flex items-center justify-center shrink-0',
        'min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl',
        'transition-all duration-150 focus-ring',
        primary
          ? 'bg-gradient-to-br from-accent to-accent-dim text-white shadow-glow-accent-sm hover:shadow-glow-accent hover:scale-105'
          : active
            ? 'bg-accent/15 text-accent border border-accent/30'
            : 'text-neutral-400 hover:text-neutral-100 hover:bg-white/5 border border-transparent',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-transparent disabled:hover:text-neutral-400',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function TransportBar({
  isPlaying, onPlayPause, onSplit, onDelete, onReset,
  currentOffset, totalDuration, clipsCount, canDelete,
  showGuides, onToggleGuides,
  onOpenProperties, onOpenMedia,
}) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 bg-editor-panel/80 backdrop-blur-md border-t border-glass-border shrink-0 overflow-x-auto scrollbar-thin">
      <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-glass-panel border border-glass-border shrink-0">
        <button
          onClick={onOpenMedia}
          className="md:hidden inline-flex items-center justify-center min-w-[40px] min-h-[40px] w-10 h-10 rounded-lg text-neutral-300 hover:text-neutral-100 hover:bg-white/5 transition-colors"
          title="Media"
        >
          <MediaIcon />
        </button>
        <TransportButton onClick={onPlayPause} title={isPlaying ? 'Pause (Space)' : 'Play (Space)'} primary>
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </TransportButton>
        <TransportButton onClick={onSplit} title="Split (S)">
          <SplitIcon />
        </TransportButton>
        <TransportButton onClick={onDelete} disabled={!canDelete} title="Delete clip">
          <TrashIcon />
        </TransportButton>
        <TransportButton onClick={onReset} title="Reset project">
          <ResetIcon />
        </TransportButton>
        <TransportButton onClick={onToggleGuides} title="Toggle guides" active={showGuides}>
          <GuidesIcon />
        </TransportButton>
      </div>

      <div className="hidden sm:block flex-1 min-w-0" />

      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-glass-panel border border-glass-border shrink-0">
        <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Time</div>
        <div className="font-mono text-[12px] tabular-nums">
          <span className="text-accent font-semibold">{formatTime(currentOffset)}</span>
          <span className="text-neutral-600 mx-1">/</span>
          <span className="text-neutral-500">{formatTime(totalDuration)}</span>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-2 text-[10px] text-neutral-500 shrink-0">
        <span className="inline-flex items-center gap-1">
          <kbd className="kbd">Space</kbd>
          <span>play</span>
        </span>
        <span className="text-neutral-700">·</span>
        <span className="inline-flex items-center gap-1">
          <kbd className="kbd">S</kbd>
          <span>split</span>
        </span>
        <span className="text-neutral-700">·</span>
        <span className="inline-flex items-center gap-1">
          <kbd className="kbd">J</kbd>
          <kbd className="kbd">K</kbd>
          <kbd className="kbd">L</kbd>
          <span>shuttle</span>
        </span>
        <span className="text-neutral-700">·</span>
        <span className="inline-flex items-center gap-1">
          <kbd className="kbd">←</kbd>
          <kbd className="kbd">→</kbd>
          <span>frame</span>
        </span>
      </div>

      <button
        onClick={onOpenProperties}
        className="lg:hidden inline-flex items-center justify-center min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl text-neutral-300 hover:text-neutral-100 hover:bg-white/5 border border-glass-border transition-colors shrink-0"
        title="Properties"
      >
        <PropertiesIcon />
      </button>
    </div>
  );
}
