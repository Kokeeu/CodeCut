import SpeedPicker from './SpeedPicker.jsx';
import AudioPanel from './AudioPanel.jsx';
import PipPicker from './PipPicker.jsx';
import { getAnimationTypes } from '../lib/textAnimations.js';

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

function DualRangeSlider({ min, max, step, valueStart, valueEnd, onChange }) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const onStartChange = (v) => {
    const s = clamp(Number(v), 0, valueEnd - step);
    onChange(s, valueEnd);
  };

  const onEndChange = (v) => {
    const e = clamp(Number(v), valueStart + step, max);
    onChange(valueStart, e);
  };

  const startPct = max > 0 ? (valueStart / max) * 100 : 0;
  const endPct = max > 0 ? (valueEnd / max) * 100 : 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-6 flex items-center">
        <div className="absolute left-0 right-0 h-1 rounded bg-slate-700" />
        <div
          className="absolute h-1 rounded bg-indigo-500"
          style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueStart}
          onChange={(e) => onStartChange(e.target.value)}
          className="absolute w-full h-6 appearance-none bg-transparent pointer-events-none z-20
                     [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-400 [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valueEnd}
          onChange={(e) => onEndChange(e.target.value)}
          className="absolute w-full h-6 appearance-none bg-transparent pointer-events-none z-30
                     [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-400 [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-slate-500">
        <span>{valueStart.toFixed(1)}s</span>
        <span>{valueEnd.toFixed(1)}s</span>
      </div>
    </div>
  );
}

export default function CardMetadata({
  meta,
  onMetaChange,
  activeClip,
  selectedTextId,
  onSelectText,
  onAddText,
  onUpdateText,
  onDeleteText,
  onSpeedChange,
  onAudioChange,
  onPipChange,
  files,
}) {
  const texts = activeClip?.texts || [];
  const clipDuration = activeClip ? Math.max(0, activeClip.sourceEnd - activeClip.sourceStart) : 0;
  const setBlur = (k, v) => onMetaChange({ ...meta, [k]: v });
  const animationTypes = getAnimationTypes();

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

      {activeClip && (
        <div className="mb-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700">
          <label className="block text-[10px] text-slate-400 mb-1.5">Speed</label>
          <SpeedPicker
            speed={activeClip.speed || 1}
            onChange={onSpeedChange}
          />
        </div>
      )}

      {activeClip && (
        <div className="mb-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700">
          <label className="block text-[10px] text-slate-400 mb-1.5">Audio</label>
          <AudioPanel
            audio={activeClip.audio || { volume: 1, mute: false, fadeIn: 0, fadeOut: 0 }}
            onChange={onAudioChange}
          />
        </div>
      )}

      {activeClip && (
        <div className="mb-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700">
          <label className="block text-[10px] text-slate-400 mb-1.5">Picture-in-Picture</label>
          <PipPicker
            pip={activeClip.pip || { enabled: false, fileId: null, position: 'bottom-right', size: 30, opacity: 1, border: true, borderWidth: 4, borderRadius: 8 }}
            files={files}
            onChange={onPipChange}
          />
        </div>
      )}

      {!activeClip ? (
        <p className="text-[11px] text-slate-500 text-center py-4">
          Select a clip to add text.
        </p>
      ) : (
        <>
          <button
            onClick={onAddText}
            className="w-full px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium mb-3"
          >
            + Add text
          </button>

          {texts.length === 0 && (
            <p className="text-[11px] text-slate-500 text-center pb-1">
              No texts in this clip. Add one and drag it on the preview.
            </p>
          )}

          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {texts.map((t, idx) => {
              const selected = t.id === selectedTextId;
              const startOff = Number(t.startOffset) || 0;
              const endOff = Number(t.endOffset) || clipDuration;
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
                  <div className="flex items-center gap-2 mb-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[9px] text-slate-500 shrink-0">size</span>
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
                  <div onClick={(e) => e.stopPropagation()}>
                    <label className="block text-[9px] text-slate-500 mb-0.5">Time range</label>
                    <DualRangeSlider
                      min={0}
                      max={clipDuration}
                      step={0.1}
                      valueStart={startOff}
                      valueEnd={endOff}
                      onChange={(s, e) => onUpdateText(t.id, { startOffset: s, endOffset: e })}
                    />
                  </div>
                  <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-[9px] text-slate-500 mb-0.5">Animation</label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={t.animation?.type || ''}
                        onChange={(e) => onUpdateText(t.id, {
                          animation: e.target.value ? { type: e.target.value, duration: t.animation?.duration || 0.5 } : null,
                        })}
                        className="flex-1 px-1.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-[10px] text-slate-200 focus:border-indigo-400 focus:outline-none"
                      >
                        <option value="">None</option>
                        {animationTypes.map((a) => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                      {t.animation?.type && (
                        <div className="flex items-center gap-1">
                          <input
                            type="range"
                            min="0.1"
                            max="2"
                            step="0.1"
                            value={t.animation.duration || 0.5}
                            onChange={(e) => onUpdateText(t.id, {
                              animation: { ...t.animation, duration: Number(e.target.value) },
                            })}
                            className="w-16 accent-indigo-500 h-1"
                          />
                          <span className="text-[9px] font-mono text-slate-400 w-7">
                            {(t.animation.duration || 0.5).toFixed(1)}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
