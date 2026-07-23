import { SPEED_OPTIONS, SPEED_LABELS } from '../lib/speed.js';

export default function SpeedPicker({ speed, onChange }) {
  return (
    <div className="flex flex-wrap gap-1">
      {SPEED_OPTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
        className={[
          'px-2 py-1 rounded text-[10px] font-mono transition-colors',
          speed === s
            ? 'bg-accent text-white'
            : 'bg-editor-surface text-neutral-400 hover:bg-editor-hover hover:text-neutral-200 border border-editor-border',
        ].join(' ')}
        >
          {SPEED_LABELS[s] || `${s}x`}
        </button>
      ))}
    </div>
  );
}
