export const PIP_POSITIONS = [
  { value: 'top-left', label: 'Superior izquierda' },
  { value: 'top-right', label: 'Superior derecha' },
  { value: 'bottom-left', label: 'Inferior izquierda' },
  { value: 'bottom-right', label: 'Inferior derecha' },
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

  const availableFiles = files.filter((f) => f.url && f.duration > 0 && !f._pending);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => set('enabled', !enabled)}
        className={[
          'px-2 py-1 rounded text-[10px] font-medium transition-colors',
          enabled ? 'bg-accent text-white' : 'bg-editor-surface text-neutral-400 hover:bg-editor-hover border border-editor-border',
        ].join(' ')}
        >
          {enabled ? 'PIP ACTIVO' : 'PIP INACTIVO'}
        </button>
      </div>

      {enabled && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-[9px] text-neutral-500">Video de origen</label>
            <select
              value={fileId || ''}
              onChange={(e) => set('fileId', e.target.value || null)}
              className="px-2 py-1 rounded text-[10px]"
            >
              <option value="">Selecciona un video…</option>
              {availableFiles.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] text-neutral-500">Posición</label>
            <div className="grid grid-cols-2 gap-1">
              {PIP_POSITIONS.map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => set('position', pos.value)}
                  className={[
                    'px-2 py-1 rounded text-[9px] transition-colors',
                    position === pos.value
                      ? 'bg-accent text-white'
                      : 'bg-editor-surface text-neutral-400 hover:bg-editor-hover border border-editor-border',
                  ].join(' ')}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-neutral-500 shrink-0">Tamaño</span>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={size}
              onChange={(e) => set('size', Number(e.target.value))}
              className="flex-1 h-1"
            />
            <span className="text-[9px] font-mono text-neutral-400 w-8 text-right">{size}%</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-neutral-500 shrink-0">Opacidad</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => set('opacity', Number(e.target.value))}
              className="flex-1 h-1"
            />
            <span className="text-[9px] font-mono text-neutral-400 w-8 text-right">{Math.round(opacity * 100)}%</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={border}
                onChange={(e) => set('border', e.target.checked)}
              />
              <span className="text-[9px] text-neutral-400">Borde</span>
            </label>
            {border && (
              <>
                <span className="text-[9px] text-neutral-500">Grosor</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={borderWidth}
                  onChange={(e) => set('borderWidth', Number(e.target.value))}
                  className="flex-1 h-1"
                />
                <span className="text-[9px] font-mono text-neutral-400 w-6 text-right">{borderWidth}px</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-neutral-500 shrink-0">Radio</span>
            <input
              type="range"
              min="0"
              max="50"
              step="2"
              value={borderRadius}
              onChange={(e) => set('borderRadius', Number(e.target.value))}
              className="flex-1 h-1"
            />
            <span className="text-[9px] font-mono text-neutral-400 w-8 text-right">{borderRadius}px</span>
          </div>
        </>
      )}
    </div>
  );
}
