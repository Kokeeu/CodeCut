export const PIP_POSITIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

export default function PipPicker({ pip, files, onChange }) {
  const enabled = pip?.enabled ?? false;
  const position = pip?.position || 'bottom-right';
  const size = pip?.size || 30;
  const opacity = pip?.opacity ?? 1;
  const border = pip?.border ?? true;
  const borderWidth = pip?.borderWidth ?? 4;
  const borderRadius = pip?.borderRadius ?? 8;
  const fileId = pip?.fileId || null;

  const set = (key, val) => onChange({ ...pip, [key]: val });

  const availableFiles = files.filter((f) => f.url && f.duration > 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => set('enabled', !enabled)}
          className={[
            'px-2 py-1 rounded text-[10px] font-medium transition-colors',
            enabled ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
          ].join(' ')}
        >
          {enabled ? 'PIP ON' : 'PIP OFF'}
        </button>
      </div>

      {enabled && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] text-slate-500">Video source</label>
            <select
              value={fileId || ''}
              onChange={(e) => set('fileId', e.target.value || null)}
              className="px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-[10px] text-slate-200 focus:border-indigo-400 focus:outline-none"
            >
              <option value="">Select video...</option>
              {availableFiles.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] text-slate-500">Position</label>
            <div className="grid grid-cols-2 gap-1">
              {PIP_POSITIONS.map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => set('position', pos.value)}
                  className={[
                    'px-2 py-1 rounded text-[9px] transition-colors',
                    position === pos.value
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
                  ].join(' ')}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500 shrink-0">Size</span>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={size}
              onChange={(e) => set('size', Number(e.target.value))}
              className="flex-1 accent-indigo-500 h-1"
            />
            <span className="text-[9px] font-mono text-slate-400 w-8 text-right">{size}%</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500 shrink-0">Opacity</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => set('opacity', Number(e.target.value))}
              className="flex-1 accent-indigo-500 h-1"
            />
            <span className="text-[9px] font-mono text-slate-400 w-8 text-right">{Math.round(opacity * 100)}%</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={border}
                onChange={(e) => set('border', e.target.checked)}
                className="accent-indigo-500"
              />
              <span className="text-[9px] text-slate-400">Border</span>
            </label>
            {border && (
              <>
                <span className="text-[9px] text-slate-500">Width</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={borderWidth}
                  onChange={(e) => set('borderWidth', Number(e.target.value))}
                  className="flex-1 accent-indigo-500 h-1"
                />
                <span className="text-[9px] font-mono text-slate-400 w-6 text-right">{borderWidth}px</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500 shrink-0">Radius</span>
            <input
              type="range"
              min="0"
              max="50"
              step="2"
              value={borderRadius}
              onChange={(e) => set('borderRadius', Number(e.target.value))}
              className="flex-1 accent-indigo-500 h-1"
            />
            <span className="text-[9px] font-mono text-slate-400 w-8 text-right">{borderRadius}px</span>
          </div>
        </>
      )}
    </div>
  );
}
