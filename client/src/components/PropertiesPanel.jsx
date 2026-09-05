import { useState } from 'react';
import SpeedPicker from './SpeedPicker.jsx';
import AudioPanel from './AudioPanel.jsx';
import PipPicker from './PipPicker.jsx';
import ClipTrim from './ClipTrim.jsx';
import ClipTransformControls from './ClipTransformControls.jsx';
import TextContentInput from './TextContentInput.jsx';
import { FONT_OPTIONS, FONT_CSS } from './CardMetadata.jsx';
import { getAnimationTypes } from '../lib/textAnimations.js';
import CollaborativeRankingPanel from './CollaborativeRankingPanel.jsx';

function DualRangeSlider({ min, max, step, valueStart, valueEnd, onChange }) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const safeMax = Math.max(max, step * 2);
  const onStartChange = (v) => onChange(clamp(Number(v), 0, valueEnd - step), valueEnd);
  const onEndChange = (v) => onChange(valueStart, clamp(Number(v), valueStart + step, safeMax));
  const startPct = safeMax > 0 ? (valueStart / safeMax) * 100 : 0;
  const endPct = safeMax > 0 ? (valueEnd / safeMax) * 100 : 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-5 flex items-center">
        <div className="absolute left-0 right-0 h-1 rounded-full bg-glass-strong" />
        <div
          className="absolute h-1 rounded-full bg-gradient-to-r from-accent-dim to-accent shadow-glow-accent-sm"
          style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={valueStart}
          onChange={(e) => onStartChange(e.target.value)}
          className="absolute w-full h-5 appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow-glow-accent-sm [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <input
          type="range" min={min} max={max} step={step} value={valueEnd}
          onChange={(e) => onEndChange(e.target.value)}
          className="absolute w-full h-5 appearance-none bg-transparent pointer-events-none z-30 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:shadow-glow-accent-sm [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-[10px] font-mono text-neutral-500">
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
  { id: 'ranking', label: 'Ranking' },
  { id: 'clip', label: 'Clip' },
];

function VideoTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="3" width="11" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 5.5l3 1.5-3 1.5v-3z" fill="currentColor" />
    </svg>
  );
}

function AudioTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7v0M5 5v4M7 3v8M9 5v4M11 7v0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function TextTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5h10M7 3.5v8M5 11.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ClipTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="4" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 4v6M9 4v6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function RankingTabIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="4.25" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="9.75" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 11c.2-2 1.2-3 2.75-3S6.8 9 7 11M7 11c.2-2 1.2-3 2.75-3s2.55 1 2.75 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const TAB_ICONS = {
  video: VideoTabIcon,
  audio: AudioTabIcon,
  text: TextTabIcon,
  ranking: RankingTabIcon,
  clip: ClipTabIcon,
};

function CollapseIcon({ collapsed }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
      <path d="M5 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Section({ title, children, className = '' }) {
  return (
    <div className={['p-2.5 rounded-xl bg-glass-panel border border-glass-border', className].join(' ')}>
      <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  );
}

export default function PropertiesPanel({
  meta, onMetaChange, activeClip, activeFile, selectedTextId, onSelectText,
  onAddText, onUpdateText, onDeleteText, onSpeedChange, onAudioChange,
  onPipChange, onCollaborativeRatingChange, onTrimChange, onTransformChange, onSeek, files, currentOffset,
  collapsed, onToggleCollapse, embedded,
}) {
  const [activeTab, setActiveTab] = useState('video');
  const texts = activeClip?.texts || [];
  const clipDuration = activeClip ? Math.max(0, activeClip.sourceEnd - activeClip.sourceStart) : 0;
  const animationTypes = getAnimationTypes();
  const setBlur = (k, v) => onMetaChange({ ...meta, [k]: v });

  if (collapsed) {
    return (
      <div className="w-14 h-full flex flex-col items-center py-2 gap-1 bg-editor-panel/60 backdrop-blur-xl border-l border-glass-border shrink-0">
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); onToggleCollapse?.(); }}
              className={[
                'w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150',
                activeTab === tab.id
                  ? 'bg-accent/15 text-accent'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5',
              ].join(' ')}
              title={tab.label}
            >
              <Icon />
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          onClick={onToggleCollapse}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-all"
          title="Expand panel"
        >
          <CollapseIcon collapsed />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-full lg:w-80 h-full flex flex-col bg-editor-panel/60 backdrop-blur-xl border-l border-glass-border shrink-0">
      <div className="flex items-center border-b border-glass-border shrink-0">
        <div className="flex flex-1">
          {TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex-1 flex items-center justify-center gap-1 py-3 text-[11px] font-semibold transition-all duration-150 relative',
                  activeTab === tab.id
                    ? 'text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-300',
                ].join(' ')}
              >
                <Icon />
                <span className="hidden xl:inline">{tab.label}</span>
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-accent-dim to-accent rounded-full" />
                )}
              </button>
            );
          })}
        </div>
        {!embedded && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex w-9 items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-white/5 transition-colors border-l border-glass-border"
            title="Collapse panel"
          >
            <CollapseIcon />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {activeTab === 'video' && (
          <div className="flex flex-col gap-2.5 animate-fade-in">
            <Section title="Background">
              <label className="flex items-center gap-2 text-[11px] text-neutral-300 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={meta.blurEnabled !== false}
                  onChange={(e) => setBlur('blurEnabled', e.target.checked)}
                  className="rounded"
                />
                Blur background
              </label>
              {meta.blurEnabled !== false && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500 font-mono w-4">σ</span>
                  <input
                    type="range" min="0" max="120" step="5"
                    value={meta.blur ?? 30}
                    onChange={(e) => setBlur('blur', Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-[10px] font-mono text-neutral-300 w-6 text-right">
                    {meta.blur ?? 30}
                  </span>
                </div>
              )}
            </Section>

            {activeClip && (
              <Section title="Speed">
                <SpeedPicker speed={activeClip.speed || 1} onChange={onSpeedChange} />
              </Section>
            )}

            {activeClip && (
              <Section title="Picture-in-Picture">
                <PipPicker
                  pip={activeClip.pip || { enabled: false, fileId: null, position: 'bottom-right', size: 30, opacity: 1, border: true, borderWidth: 4, borderRadius: 8 }}
                  files={files} onChange={onPipChange}
                />
              </Section>
            )}
          </div>
        )}

        {activeTab === 'audio' && (
          <div className="flex flex-col gap-2.5 animate-fade-in">
            {activeClip ? (
              <Section title="Audio">
                <AudioPanel
                  audio={activeClip.audio || { volume: 1, mute: false, fadeIn: 0, fadeOut: 0 }}
                  onChange={onAudioChange}
                />
              </Section>
            ) : (
              <div className="p-4 rounded-xl bg-glass-panel border border-dashed border-glass-border text-center">
                <p className="text-[11px] text-neutral-500">Select a clip to edit audio</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'text' && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <button
              onClick={onAddText}
              disabled={!activeClip}
              className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl bg-gradient-accent-soft border border-accent/20 text-xs font-semibold text-accent disabled:opacity-40 disabled:cursor-not-allowed hover:border-accent/40 hover:bg-accent/15 transition-all duration-150"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Add text
            </button>

            {!activeClip && (
              <div className="p-3 rounded-xl bg-glass-panel border border-dashed border-glass-border text-center">
                <p className="text-[11px] text-neutral-500">Select a clip to add text</p>
              </div>
            )}

            {texts.length === 0 && activeClip && (
              <div className="p-3 rounded-xl bg-glass-panel border border-dashed border-glass-border text-center">
                <p className="text-[11px] text-neutral-500">No texts yet — add one to start</p>
              </div>
            )}

            {texts.map((t, idx) => {
              const selected = t.id === selectedTextId;
              const startOff = Number(t.startOffset) || 0;
              const endOff = Number(t.endOffset) || clipDuration;
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectText(t.id)}
                  className={[
                    'p-2.5 rounded-xl border cursor-pointer transition-all duration-150',
                    selected
                      ? 'border-accent/50 bg-accent/[0.04] shadow-glow-accent-sm'
                      : 'border-glass-border bg-glass-panel hover:border-white/20',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Text {idx + 1}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteText(t.id); }}
                      className="w-5 h-5 rounded flex items-center justify-center text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors text-[14px] leading-none"
                      title="Delete text"
                    >
                      ×
                    </button>
                  </div>
                  <TextContentInput
                    value={t.text}
                    onChange={(newValue) => onUpdateText(t.id, { text: newValue })}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Text content"
                    maxLength={100}
                    className="w-full px-2 py-1.5 rounded-lg text-[12px] mb-2"
                  />
                  <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    <select
                      value={t.font || 'inter'}
                      onChange={(e) => onUpdateText(t.id, { font: e.target.value })}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1.5 rounded-lg text-[10px]"
                    >
                      {FONT_OPTIONS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
                    </select>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={t.color || '#ffffff'}
                        onChange={(e) => onUpdateText(t.id, { color: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-6 h-6 rounded-md border border-glass-border cursor-pointer bg-transparent"
                      />
                      <span className="text-[9px] font-mono text-neutral-500 truncate">{t.color || '#ffffff'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[10px] text-neutral-500 shrink-0 w-8">size</span>
                    <input
                      type="range" min="12" max="200" step="1"
                      value={t.size || 60}
                      onChange={(e) => onUpdateText(t.id, { size: Number(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-[10px] font-mono text-neutral-300 w-7 text-right">{Math.round(t.size || 60)}</span>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <label className="block text-[10px] text-neutral-500 mb-1">Time range</label>
                    <DualRangeSlider
                      min={0} max={clipDuration} step={0.1}
                      valueStart={startOff} valueEnd={endOff}
                      onChange={(s, e) => onUpdateText(t.id, { startOffset: s, endOffset: e })}
                    />
                  </div>
                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-[10px] text-neutral-500 mb-1">Animation</label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={t.animation?.type || ''}
                        onChange={(e) => onUpdateText(t.id, {
                          animation: e.target.value ? { type: e.target.value, duration: t.animation?.duration || 0.5 } : null,
                        })}
                        className="flex-1 px-2 py-1.5 rounded-lg text-[10px]"
                      >
                        <option value="">None</option>
                        {animationTypes.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}
                      </select>
                      {t.animation?.type && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="range" min="0.1" max="2" step="0.1"
                            value={t.animation.duration || 0.5}
                            onChange={(e) => onUpdateText(t.id, {
                              animation: { ...t.animation, duration: Number(e.target.value) },
                            })}
                            className="w-14"
                          />
                          <span className="text-[10px] font-mono text-neutral-300 w-7 text-right">
                            {(t.animation.duration || 0.5).toFixed(1)}s
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-glass-border" onClick={(e) => e.stopPropagation()}>
                    <label className="flex items-center gap-2 text-[10px] text-neutral-400 mb-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.bgEnabled || false}
                        onChange={(e) => onUpdateText(t.id, { bgEnabled: e.target.checked })}
                        className="rounded"
                      />
                      Background
                    </label>
                    {t.bgEnabled && (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={t.bgColor || '#000000'}
                            onChange={(e) => onUpdateText(t.id, { bgColor: e.target.value })}
                            className="w-6 h-6 rounded-md border border-glass-border cursor-pointer bg-transparent"
                          />
                          <span className="text-[10px] text-neutral-500 flex-1">Color</span>
                          <input
                            type="range" min="0" max="1" step="0.05"
                            value={t.bgOpacity ?? 0.7}
                            onChange={(e) => onUpdateText(t.id, { bgOpacity: Number(e.target.value) })}
                            className="w-16"
                          />
                          <span className="text-[10px] font-mono text-neutral-300 w-8 text-right">
                            {Math.round((t.bgOpacity ?? 0.7) * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-neutral-500 w-12">Padding</span>
                          <input
                            type="range" min="0" max="40" step="1"
                            value={t.bgPadding || 12}
                            onChange={(e) => onUpdateText(t.id, { bgPadding: Number(e.target.value) })}
                            className="flex-1"
                          />
                          <span className="text-[10px] font-mono text-neutral-300 w-6 text-right">
                            {t.bgPadding || 12}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-neutral-500 w-12">Radius</span>
                          <input
                            type="range" min="0" max="30" step="1"
                            value={t.bgRadius || 8}
                            onChange={(e) => onUpdateText(t.id, { bgRadius: Number(e.target.value) })}
                            className="flex-1"
                          />
                          <span className="text-[10px] font-mono text-neutral-300 w-6 text-right">
                            {t.bgRadius || 8}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <label className="flex items-center gap-2 text-[10px] text-neutral-400 mb-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.strokeEnabled || false}
                        onChange={(e) => onUpdateText(t.id, { strokeEnabled: e.target.checked })}
                        className="rounded"
                      />
                      Stroke
                    </label>
                    {t.strokeEnabled && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={t.strokeColor || '#000000'}
                          onChange={(e) => onUpdateText(t.id, { strokeColor: e.target.value })}
                          className="w-6 h-6 rounded-md border border-glass-border cursor-pointer bg-transparent"
                        />
                        <span className="text-[10px] text-neutral-500 flex-1">Width</span>
                        <input
                          type="range" min="1" max="8" step="1"
                          value={t.strokeWidth || 2}
                          onChange={(e) => onUpdateText(t.id, { strokeWidth: Number(e.target.value) })}
                          className="w-16"
                        />
                        <span className="text-[10px] font-mono text-neutral-300 w-6 text-right">
                          {t.strokeWidth || 2}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <label className="block text-[10px] text-neutral-500 mb-1">Rotation</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="range" min="-180" max="180" step="1"
                        value={t.rotation || 0}
                        onChange={(e) => onUpdateText(t.id, { rotation: Number(e.target.value) })}
                        className="flex-1"
                      />
                      <span className="text-[10px] font-mono text-neutral-300 w-8 text-right">
                        {t.rotation || 0}°
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="animate-fade-in">
            <CollaborativeRankingPanel
              meta={meta}
              activeClip={activeClip}
              onMetaChange={onMetaChange}
              onRatingChange={onCollaborativeRatingChange}
            />
          </div>
        )}

        {activeTab === 'clip' && (
          <div className="flex flex-col gap-2.5 animate-fade-in">
            {activeClip && (
              <Section title="Transform">
                <ClipTransformControls
                  transform={activeClip.transform || { x: 0, y: 0, scale: 1 }}
                  onTransformChange={onTransformChange}
                />
              </Section>
            )}
            {activeClip && activeFile ? (
              <Section title="Trim">
                <ClipTrim
                  clip={activeClip}
                  file={activeFile}
                  currentOffset={currentOffset}
                  onChange={onTrimChange}
                  onSeek={onSeek}
                />
              </Section>
            ) : (
              <div className="p-3 rounded-xl bg-glass-panel border border-dashed border-glass-border text-center">
                <p className="text-[11px] text-neutral-500">Select a clip to trim</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
