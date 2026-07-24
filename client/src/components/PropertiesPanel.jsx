import { useState } from 'react';
import SpeedPicker from './SpeedPicker.jsx';
import AudioPanel from './AudioPanel.jsx';
import PipPicker from './PipPicker.jsx';
import ClipTrim from './ClipTrim.jsx';
import { FONT_OPTIONS, FONT_CSS } from './CardMetadata.jsx';
import { getAnimationTypes } from '../lib/textAnimations.js';

function DualRangeSlider({ min, max, step, valueStart, valueEnd, onChange }) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const onStartChange = (v) => onChange(clamp(Number(v), 0, valueEnd - step), valueEnd);
  const onEndChange = (v) => onChange(valueStart, clamp(Number(v), valueStart + step, max));
  const startPct = max > 0 ? (valueStart / max) * 100 : 0;
  const endPct = max > 0 ? (valueEnd / max) * 100 : 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-5 flex items-center">
        <div className="absolute left-0 right-0 h-0.5 rounded bg-editor-border" />
        <div className="absolute h-0.5 rounded bg-accent" style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }} />
        <input type="range" min={min} max={max} step={step} value={valueStart}
          onChange={(e) => onStartChange(e.target.value)}
          className="absolute w-full h-5 appearance-none bg-transparent pointer-events-none z-20
                     [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer" />
        <input type="range" min={min} max={max} step={step} value={valueEnd}
          onChange={(e) => onEndChange(e.target.value)}
          className="absolute w-full h-5 appearance-none bg-transparent pointer-events-none z-30
                     [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:cursor-pointer" />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-neutral-500">
        <span>{valueStart.toFixed(1)}s</span>
        <span>{valueEnd.toFixed(1)}s</span>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
  { id: 'text', label: 'Text' },
  { id: 'clip', label: 'Clip' },
];

export default function PropertiesPanel({
  meta, onMetaChange, activeClip, activeFile, selectedTextId, onSelectText,
  onAddText, onUpdateText, onDeleteText, onSpeedChange, onAudioChange,
  onPipChange, onTrimChange, onSeek, files, currentOffset,
}) {
  const [activeTab, setActiveTab] = useState('video');
  const texts = activeClip?.texts || [];
  const clipDuration = activeClip ? Math.max(0, activeClip.sourceEnd - activeClip.sourceStart) : 0;
  const animationTypes = getAnimationTypes();
  const setBlur = (k, v) => onMetaChange({ ...meta, [k]: v });

  return (
    <div className="w-[280px] bg-editor-panel border-l border-editor-border flex flex-col shrink-0 overflow-hidden">
      <div className="flex border-b border-editor-border shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex-1 py-2 text-[11px] font-medium transition-colors border-b-2',
              activeTab === tab.id
                ? 'text-accent border-accent'
                : 'text-neutral-500 border-transparent hover:text-neutral-300',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'video' && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="flex items-center gap-2 text-[11px] text-neutral-400 mb-1.5 cursor-pointer">
                <input type="checkbox" checked={meta.blurEnabled !== false}
                  onChange={(e) => setBlur('blurEnabled', e.target.checked)} />
                Blur background
              </label>
              {meta.blurEnabled !== false && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 w-6">σ</span>
                  <input type="range" min="0" max="120" step="5" value={meta.blur ?? 30}
                    onChange={(e) => setBlur('blur', Number(e.target.value))} className="flex-1" />
                  <span className="text-[10px] font-mono text-neutral-400 w-5 text-right">{meta.blur ?? 30}</span>
                </div>
              )}
            </div>

            {activeClip && (
              <div className="p-2 rounded-lg bg-editor-surface border border-editor-border">
                <label className="block text-[10px] text-neutral-400 mb-1.5">Speed</label>
                <SpeedPicker speed={activeClip.speed || 1} onChange={onSpeedChange} />
              </div>
            )}

            {activeClip && (
              <div className="p-2 rounded-lg bg-editor-surface border border-editor-border">
                <label className="block text-[10px] text-neutral-400 mb-1.5">Picture-in-Picture</label>
                <PipPicker
                  pip={activeClip.pip || { enabled: false, fileId: null, position: 'bottom-right', size: 30, opacity: 1, border: true, borderWidth: 4, borderRadius: 8 }}
                  files={files} onChange={onPipChange} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="flex flex-col gap-3">
            {activeClip ? (
              <div className="p-2 rounded-lg bg-editor-surface border border-editor-border">
                <AudioPanel
                  audio={activeClip.audio || { volume: 1, mute: false, fadeIn: 0, fadeOut: 0 }}
                  onChange={onAudioChange} />
              </div>
            ) : (
              <p className="text-[11px] text-neutral-500 text-center py-4">Select a clip to edit audio.</p>
            )}
          </div>
        )}

        {activeTab === 'text' && (
          <div className="flex flex-col gap-2">
            <button onClick={onAddText} disabled={!activeClip}
              className="w-full px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              + Add text
            </button>

            {!activeClip && (
              <p className="text-[11px] text-neutral-500 text-center py-2">Select a clip to add text.</p>
            )}

            {texts.length === 0 && activeClip && (
              <p className="text-[10px] text-neutral-500 text-center py-1">No texts yet.</p>
            )}

            {texts.map((t, idx) => {
              const selected = t.id === selectedTextId;
              const startOff = Number(t.startOffset) || 0;
              const endOff = Number(t.endOffset) || clipDuration;
              return (
                <div key={t.id} onClick={() => onSelectText(t.id)}
                  className={[
                    'p-2 rounded-lg border cursor-pointer transition-colors',
                    selected ? 'border-accent bg-accent-bg' : 'border-editor-border bg-editor-surface hover:border-neutral-600',
                  ].join(' ')}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-neutral-500">#{idx + 1}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDeleteText(t.id); }}
                      className="w-4 h-4 rounded bg-editor-border hover:bg-red-600 text-[10px] leading-none text-neutral-300 transition-colors">×</button>
                  </div>
                  <input value={t.text} onChange={(e) => onUpdateText(t.id, { text: e.target.value })}
                    onClick={(e) => e.stopPropagation()} placeholder="Text content" maxLength={100}
                    className="w-full px-2 py-1 rounded text-[11px] mb-1.5" />
                  <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    <select value={t.font || 'inter'} onChange={(e) => onUpdateText(t.id, { font: e.target.value })}
                      onClick={(e) => e.stopPropagation()} className="px-1.5 py-1 rounded text-[10px]">
                      {FONT_OPTIONS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
                    </select>
                    <div className="flex items-center gap-1">
                      <input type="color" value={t.color || '#ffffff'}
                        onChange={(e) => onUpdateText(t.id, { color: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 rounded border border-editor-border cursor-pointer" />
                      <span className="text-[9px] font-mono text-neutral-500 truncate">{t.color || '#ffffff'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[9px] text-neutral-500 shrink-0">size</span>
                    <input type="range" min="12" max="200" step="1" value={t.size || 60}
                      onChange={(e) => onUpdateText(t.id, { size: Number(e.target.value) })} className="flex-1" />
                    <span className="text-[9px] font-mono text-neutral-400 w-6 text-right">{Math.round(t.size || 60)}</span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <label className="block text-[9px] text-neutral-500 mb-0.5">Time range</label>
                    <DualRangeSlider min={0} max={clipDuration} step={0.1}
                      valueStart={startOff} valueEnd={endOff}
                      onChange={(s, e) => onUpdateText(t.id, { startOffset: s, endOffset: e })} />
                  </div>
                  <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-[9px] text-neutral-500 mb-0.5">Animation</label>
                    <div className="flex items-center gap-1.5">
                      <select value={t.animation?.type || ''}
                        onChange={(e) => onUpdateText(t.id, {
                          animation: e.target.value ? { type: e.target.value, duration: t.animation?.duration || 0.5 } : null,
                        })}
                        className="flex-1 px-1.5 py-1 rounded text-[10px]">
                        <option value="">None</option>
                        {animationTypes.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}
                      </select>
                      {t.animation?.type && (
                        <div className="flex items-center gap-1">
                          <input type="range" min="0.1" max="2" step="0.1"
                            value={t.animation.duration || 0.5}
                            onChange={(e) => onUpdateText(t.id, {
                              animation: { ...t.animation, duration: Number(e.target.value) },
                            })} className="w-14" />
                          <span className="text-[9px] font-mono text-neutral-400 w-6">
                            {(t.animation.duration || 0.5).toFixed(1)}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-editor-border" onClick={(e) => e.stopPropagation()}>
                    <label className="flex items-center gap-1.5 text-[9px] text-neutral-400 mb-1 cursor-pointer">
                      <input type="checkbox" checked={t.bgEnabled || false}
                        onChange={(e) => onUpdateText(t.id, { bgEnabled: e.target.checked })} />
                      Background
                    </label>
                    {t.bgEnabled && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <input type="color" value={t.bgColor || '#000000'}
                            onChange={(e) => onUpdateText(t.id, { bgColor: e.target.value })}
                            className="w-5 h-5 rounded border border-editor-border cursor-pointer" />
                          <span className="text-[9px] text-neutral-500 flex-1">Color</span>
                          <input type="range" min="0" max="1" step="0.05" value={t.bgOpacity ?? 0.7}
                            onChange={(e) => onUpdateText(t.id, { bgOpacity: Number(e.target.value) })} className="w-14" />
                          <span className="text-[9px] font-mono text-neutral-400 w-6 text-right">{Math.round((t.bgOpacity ?? 0.7) * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-neutral-500 w-10">Padding</span>
                          <input type="range" min="0" max="40" step="1" value={t.bgPadding || 12}
                            onChange={(e) => onUpdateText(t.id, { bgPadding: Number(e.target.value) })} className="flex-1" />
                          <span className="text-[9px] font-mono text-neutral-400 w-5 text-right">{t.bgPadding || 12}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-neutral-500 w-10">Radius</span>
                          <input type="range" min="0" max="30" step="1" value={t.bgRadius || 8}
                            onChange={(e) => onUpdateText(t.id, { bgRadius: Number(e.target.value) })} className="flex-1" />
                          <span className="text-[9px] font-mono text-neutral-400 w-5 text-right">{t.bgRadius || 8}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <label className="flex items-center gap-1.5 text-[9px] text-neutral-400 mb-1 cursor-pointer">
                      <input type="checkbox" checked={t.strokeEnabled || false}
                        onChange={(e) => onUpdateText(t.id, { strokeEnabled: e.target.checked })} />
                      Stroke
                    </label>
                    {t.strokeEnabled && (
                      <div className="flex items-center gap-1.5">
                        <input type="color" value={t.strokeColor || '#000000'}
                          onChange={(e) => onUpdateText(t.id, { strokeColor: e.target.value })}
                          className="w-5 h-5 rounded border border-editor-border cursor-pointer" />
                        <span className="text-[9px] text-neutral-500 flex-1">Width</span>
                        <input type="range" min="1" max="8" step="1" value={t.strokeWidth || 2}
                          onChange={(e) => onUpdateText(t.id, { strokeWidth: Number(e.target.value) })} className="w-14" />
                        <span className="text-[9px] font-mono text-neutral-400 w-5 text-right">{t.strokeWidth || 2}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-[9px] text-neutral-500 mb-0.5">Rotation</label>
                    <div className="flex items-center gap-1.5">
                      <input type="range" min="-180" max="180" step="1" value={t.rotation || 0}
                        onChange={(e) => onUpdateText(t.id, { rotation: Number(e.target.value) })} className="flex-1" />
                      <span className="text-[9px] font-mono text-neutral-400 w-8 text-right">{t.rotation || 0}°</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'clip' && (
          <div className="flex flex-col gap-3">
            {activeClip && activeFile ? (
              <ClipTrim clip={activeClip} file={activeFile} currentOffset={currentOffset}
                onChange={onTrimChange} onSeek={onSeek} />
            ) : (
              <p className="text-[11px] text-neutral-500 text-center py-4">Select a clip to trim.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
