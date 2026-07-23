export default function AudioPanel({ audio, onChange }) {
  const vol = audio?.volume ?? 1;
  const mute = audio?.mute ?? false;
  const fadeIn = audio?.fadeIn ?? 0;
  const fadeOut = audio?.fadeOut ?? 0;

  const set = (key, val) => onChange({ ...audio, [key]: val });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => set('mute', !mute)}
        className={[
          'px-2 py-1 rounded text-[10px] font-medium transition-colors',
          mute ? 'bg-red-600 text-white' : 'bg-editor-surface text-neutral-400 hover:bg-editor-hover border border-editor-border',
        ].join(' ')}
        >
          {mute ? 'MUTED' : 'AUDIO'}
        </button>
        <div className="flex items-center gap-1 flex-1">
          <span className="text-[9px] text-neutral-500 shrink-0">vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={vol}
            onChange={(e) => set('volume', Number(e.target.value))}
            disabled={mute}
            className="flex-1 h-1 disabled:opacity-40"
          />
          <span className="text-[9px] font-mono text-neutral-400 w-8 text-right">
            {Math.round(vol * 100)}%
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-neutral-500 shrink-0">in</span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={fadeIn}
            onChange={(e) => set('fadeIn', Number(e.target.value))}
            className="flex-1 h-1"
          />
          <span className="text-[9px] font-mono text-neutral-400 w-7 text-right">
            {fadeIn.toFixed(1)}s
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-neutral-500 shrink-0">out</span>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={fadeOut}
            onChange={(e) => set('fadeOut', Number(e.target.value))}
            className="flex-1 h-1"
          />
          <span className="text-[9px] font-mono text-neutral-400 w-7 text-right">
            {fadeOut.toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  );
}
