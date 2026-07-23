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
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200',
          ].join(' ')}
        >
          {SPEED_LABELS[s] || `${s}x`}
        </button>
      ))}
    </div>
  );
}
