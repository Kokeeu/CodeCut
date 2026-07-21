export const FONT_OPTIONS = [
  { value: 'inter', label: 'Inter' },
  { value: 'montserrat', label: 'Montserrat' },
  { value: 'bebasneue', label: 'Bebas Neue' },
  { value: 'arial', label: 'Arial' },
];

export const FONT_CSS = {
  inter: "'Inter', sans-serif",
  montserrat: "'Montserrat', sans-serif",
  bebasneue: "'Bebas Neue', sans-serif",
  arial: "Arial, sans-serif",
};

export default function CardMetadata({
  meta,
  onMetaChange,
  selectedTextId,
  onSelectText,
  onAddText,
  onUpdateText,
  onDeleteText,
}) {
  const texts = meta.texts || [];
  const setBlur = (k, v) => onMetaChange({ ...meta, [k]: v });

  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
      <h2 className="text-sm font-semibold text-slate-200 mb-3">Card design</h2>

      <div className="mb-3">
        <label className="flex items-center gap-2 text-[11px] text-slate-400 mb-1 cursor-pointer">
          <input
            type="checkbox"
            checked={meta.blurEnabled !== false}
            onChange={(e) => setBlur('blurEnabled', e.target.checked)}
            className="accent-indigo-500"
          />
          Blur background
        </label>
        {meta.blurEnabled !== false && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-8">blur</span>
            <input
              type="range"
              min="0"
              max="120"
              step="5"
              value={meta.blur ?? 30}
              onChange={(e) => setBlur('blur', Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-[10px] font-mono text-slate-400 w-6 text-right">{meta.blur ?? 30}</span>
          </div>
        )}
      </div>

      <button
        onClick={onAddText}
        className="w-full px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium mb-3"
      >
        + Add text
      </button>

      {texts.length === 0 && (
        <p className="text-[11px] text-slate-500 text-center pb-1">
          No texts yet. Add one and drag it on the preview.
        </p>
      )}

      <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
        {texts.map((t, idx) => {
          const selected = t.id === selectedTextId;
          return (
            <div
              key={t.id}
              onClick={() => onSelectText(t.id)}
              className={[
                'p-2 rounded-lg border cursor-pointer transition-colors',
                selected
                  ? 'border-indigo-400 bg-indigo-500/10'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-500',
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-slate-500">Text #{idx + 1}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteText(t.id); }}
                  className="w-5 h-5 rounded bg-slate-700 hover:bg-red-600 text-[11px] leading-none text-slate-200"
                  title="Delete text"
                >
                  ×
                </button>
              </div>
              <input
                value={t.text}
                onChange={(e) => onUpdateText(t.id, { text: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Text content"
                maxLength={100}
                className="w-full px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:border-indigo-400 focus:outline-none mb-1.5"
              />
              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <select
                  value={t.font || 'inter'}
                  onChange={(e) => onUpdateText(t.id, { font: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="px-1.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-[11px] text-slate-200 focus:border-indigo-400 focus:outline-none"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={t.color || '#ffffff'}
                    onChange={(e) => onUpdateText(t.id, { color: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    className="w-6 h-6 rounded border border-slate-700 bg-slate-900 cursor-pointer"
                  />
                  <span className="text-[9px] font-mono text-slate-500 truncate">{t.color || '#ffffff'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-[9px] text-slate-500">size</span>
                <input
                  type="range"
                  min="12"
                  max="200"
                  step="1"
                  value={t.size || 60}
                  onChange={(e) => onUpdateText(t.id, { size: Number(e.target.value) })}
                  className="flex-1 accent-indigo-500 h-1"
                />
                <span className="text-[9px] font-mono text-slate-400 w-7 text-right">{Math.round(t.size || 60)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
