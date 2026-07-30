const OUTPUT_W = 1080;
const OUTPUT_H = 1920;

export default function ClipTransformControls({ transform, onTransformChange }) {
  const t = transform || { x: 0, y: 0, scale: 1 };

  const handleCenter = () => {
    onTransformChange({ x: 0, y: 0, scale: t.scale });
  };

  const handleFitW = () => {
    onTransformChange({ x: 0, y: 0, scale: 1 });
  };

  const handleFill = () => {
    onTransformChange({ x: 0, y: 0, scale: OUTPUT_H / OUTPUT_W });
  };

  const handleReset = () => {
    onTransformChange({ x: 0, y: 0, scale: 1 });
  };

  const handleScaleChange = (e) => {
    const newScale = Number(e.target.value);
    onTransformChange({ x: t.x, y: t.y, scale: newScale });
  };

  return (
    <div className="p-2 rounded-lg bg-editor-surface border border-editor-border">
      <label className="block text-[10px] text-neutral-400 mb-1.5">Transform</label>
      
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] text-neutral-500 shrink-0">Scale:</span>
        <input
          type="range"
          min="0.1"
          max="4"
          step="0.05"
          value={t.scale}
          onChange={handleScaleChange}
          className="flex-1 h-1"
        />
        <span className="text-[9px] font-mono text-neutral-400 w-10 text-right">
          {Math.round(t.scale * 100)}%
        </span>
      </div>

      <div className="flex gap-1 mb-2">
        <button
          onClick={handleCenter}
          className="flex-1 px-2 py-1 rounded bg-editor-border hover:bg-editor-hover text-neutral-300 text-[10px] font-medium transition-colors"
          title="Center (reset X/Y)"
        >
          Center
        </button>
        <button
          onClick={handleFitW}
          className="flex-1 px-2 py-1 rounded bg-editor-border hover:bg-editor-hover text-neutral-300 text-[10px] font-medium transition-colors"
          title="Fit Width (scale=1)"
        >
          Fit W
        </button>
        <button
          onClick={handleFill}
          className="flex-1 px-2 py-1 rounded bg-editor-border hover:bg-editor-hover text-neutral-300 text-[10px] font-medium transition-colors"
          title="Fill Screen (scale=1.78)"
        >
          Fill
        </button>
        <button
          onClick={handleReset}
          className="flex-1 px-2 py-1 rounded bg-accent hover:bg-accent-hover text-white text-[10px] font-medium transition-colors"
          title="Reset all (X/Y/Scale)"
        >
          Reset
        </button>
      </div>

      <div className="flex items-center gap-3 text-[9px] font-mono text-neutral-500">
        <span>X: {Math.round(t.x)}</span>
        <span>Y: {Math.round(t.y)}</span>
        <span>Scale: {t.scale.toFixed(2)}x</span>
      </div>
    </div>
  );
}
