import SpeedPicker from './SpeedPicker.jsx';
import AudioPanel from './AudioPanel.jsx';
import PipPicker from './PipPicker.jsx';
import ClipTrim from './ClipTrim.jsx';
import ClipTransformControls from './ClipTransformControls.jsx';
import TextContentInput from './TextContentInput.jsx';
import { FONT_OPTIONS } from './CardMetadata.jsx';
import { getAnimationTypes } from '../lib/textAnimations.js';
import CollaborativeRankingPanel from './CollaborativeRankingPanel.jsx';

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InspectorSection({ title, eyebrow, children, defaultOpen = false }) {
  return (
    <details className="inspector-section group rounded-xl bg-glass-panel border border-glass-border shadow-inset-glass overflow-hidden" defaultOpen={defaultOpen}>
      <summary className="h-10 px-3 flex items-center gap-2 cursor-pointer select-none list-none text-neutral-300 hover:bg-white/[0.025] transition-colors focus-ring">
        <span className="w-1 h-1 rounded-full bg-signal/75 shadow-[0_0_7px_rgba(34,211,238,0.55)]" />
        <span className="flex-1 min-w-0">
          {eyebrow && <span className="mr-2 text-[8px] font-mono text-neutral-600 uppercase tracking-[0.14em]">{eyebrow}</span>}
          <span className="text-[10px] font-bold uppercase tracking-[0.12em]">{title}</span>
        </span>
        <span className="text-neutral-600 transition-transform duration-200 group-open:rotate-180"><ChevronIcon /></span>
      </summary>
      <div className="px-3 pb-3 pt-1 border-t border-glass-border/70">{children}</div>
    </details>
  );
}

function DualRangeSlider({ min, max, step, valueStart, valueEnd, onChange }) {
  const safeMax = Math.max(max, step * 2);
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const startPct = safeMax > 0 ? (valueStart / safeMax) * 100 : 0;
  const endPct = safeMax > 0 ? (valueEnd / safeMax) * 100 : 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-5 flex items-center">
        <div className="absolute left-0 right-0 h-1 rounded-full bg-glass-strong" />
        <div className="absolute h-1 rounded-full bg-gradient-to-r from-accent to-signal shadow-glow-accent-sm" style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }} />
        <input
          aria-label="Inicio del texto"
          type="range"
          min={min}
          max={safeMax}
          step={step}
          value={valueStart}
          onChange={(event) => onChange(clamp(Number(event.target.value), 0, valueEnd - step), valueEnd)}
          className="absolute w-full h-5 appearance-none bg-transparent pointer-events-none z-20 [&::-webkit-slider-thumb]:pointer-events-auto"
        />
        <input
          aria-label="Final del texto"
          type="range"
          min={min}
          max={safeMax}
          step={step}
          value={valueEnd}
          onChange={(event) => onChange(valueStart, clamp(Number(event.target.value), valueStart + step, safeMax))}
          className="absolute w-full h-5 appearance-none bg-transparent pointer-events-none z-30 [&::-webkit-slider-thumb]:pointer-events-auto"
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-neutral-500">
        <span>{valueStart.toFixed(1)} s</span>
        <span>{valueEnd.toFixed(1)} s</span>
      </div>
    </div>
  );
}

function TextPicker({ texts, selectedTextId, onSelectText, onAddText }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
      {texts.map((text, index) => (
        <button
          key={text.id}
          type="button"
          onClick={() => onSelectText(text.id)}
          className={[
            'shrink-0 h-8 px-2.5 rounded-lg border text-[10px] font-semibold transition-colors focus-ring',
            selectedTextId === text.id
              ? 'bg-accent/15 border-accent/35 text-signal'
              : 'bg-glass-panel border-glass-border text-neutral-500 hover:text-neutral-200',
          ].join(' ')}
        >
          T{index + 1}
        </button>
      ))}
      <button type="button" onClick={onAddText} className="shrink-0 h-8 px-2.5 rounded-lg border border-dashed border-accent/30 text-accent text-[10px] font-semibold hover:bg-accent/10 focus-ring">
        + Texto
      </button>
    </div>
  );
}

function SelectedTextEditor({ text, clipDuration, animationTypes, onUpdate, onDelete }) {
  const startOffset = Number(text.startOffset) || 0;
  const endOffset = Number(text.endOffset) || clipDuration;

  return (
    <div className="flex flex-col gap-2.5 animate-fade-in">
      <InspectorSection title="Contenido" eyebrow="Texto" defaultOpen>
        <TextContentInput
          value={text.text}
          onChange={(value) => onUpdate({ text: value })}
          placeholder="Escribe el texto"
          maxLength={100}
          className="w-full px-2.5 py-2 rounded-lg text-xs"
        />
      </InspectorSection>

      <InspectorSection title="Tipografía y color" defaultOpen>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <select value={text.font || 'inter'} onChange={(event) => onUpdate({ font: event.target.value })} className="w-full text-[11px]">
            {FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
          </select>
          <input type="color" value={text.color || '#ffffff'} onChange={(event) => onUpdate({ color: event.target.value })} className="w-9 h-8 rounded-lg border border-glass-border cursor-pointer bg-transparent" aria-label="Color del texto" />
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <span className="control-label w-12">Tamaño</span>
          <input type="range" min="12" max="200" step="1" value={text.size || 60} onChange={(event) => onUpdate({ size: Number(event.target.value) })} className="flex-1" />
          <span className="control-value">{Math.round(text.size || 60)}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-2.5">
          {['left', 'center', 'right'].map((align) => (
            <button
              key={align}
              type="button"
              onClick={() => onUpdate({ align })}
              className={[
                'h-8 rounded-lg border text-[10px] font-semibold transition-colors',
                (text.align || 'center') === align
                  ? 'bg-accent/15 border-accent/35 text-signal'
                  : 'bg-glass-panel border-glass-border text-neutral-500 hover:text-neutral-200',
              ].join(' ')}
            >
              {align === 'left' ? 'Izquierda' : align === 'right' ? 'Derecha' : 'Centro'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2.5">
          <span className="control-label w-12">Rotación</span>
          <input type="range" min="-180" max="180" step="1" value={text.rotation || 0} onChange={(event) => onUpdate({ rotation: Number(event.target.value) })} className="flex-1" />
          <span className="control-value">{text.rotation || 0}°</span>
        </div>
      </InspectorSection>

      <InspectorSection title="Tiempo y animación" defaultOpen>
        <DualRangeSlider min={0} max={clipDuration} step={0.1} valueStart={startOffset} valueEnd={endOffset} onChange={(start, end) => onUpdate({ startOffset: start, endOffset: end })} />
        <div className="grid grid-cols-[1fr_auto] gap-2 mt-2.5">
          <select
            value={text.animation?.type || ''}
            onChange={(event) => onUpdate({ animation: event.target.value ? { type: event.target.value, duration: text.animation?.duration || 0.5 } : null })}
            className="text-[11px]"
          >
            <option value="">Sin animación</option>
            {animationTypes.map((animation) => <option key={animation.value} value={animation.value}>{animation.label}</option>)}
          </select>
          {text.animation?.type && <span className="control-value self-center">{(text.animation.duration || 0.5).toFixed(1)} s</span>}
        </div>
        {text.animation?.type && (
          <input type="range" min="0.1" max="2" step="0.1" value={text.animation.duration || 0.5} onChange={(event) => onUpdate({ animation: { ...text.animation, duration: Number(event.target.value) } })} className="w-full mt-1" aria-label="Duración de la animación" />
        )}
      </InspectorSection>

      <InspectorSection title="Fondo y contorno">
        <label className="toggle-row">
          <input type="checkbox" checked={text.bgEnabled || false} onChange={(event) => onUpdate({ bgEnabled: event.target.checked })} />
          Fondo del texto
        </label>
        {text.bgEnabled && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <input type="color" value={text.bgColor || '#000000'} onChange={(event) => onUpdate({ bgColor: event.target.value })} className="w-8 h-7 rounded-md bg-transparent" aria-label="Color de fondo" />
              <span className="control-label flex-1">Opacidad</span>
              <input type="range" min="0" max="1" step="0.05" value={text.bgOpacity ?? 0.7} onChange={(event) => onUpdate({ bgOpacity: Number(event.target.value) })} className="w-24" />
            </div>
            <div className="flex items-center gap-2"><span className="control-label w-14">Margen</span><input type="range" min="0" max="40" step="1" value={text.bgPadding || 12} onChange={(event) => onUpdate({ bgPadding: Number(event.target.value) })} className="flex-1" /><span className="control-value">{text.bgPadding || 12}</span></div>
            <div className="flex items-center gap-2"><span className="control-label w-14">Radio</span><input type="range" min="0" max="30" step="1" value={text.bgRadius || 8} onChange={(event) => onUpdate({ bgRadius: Number(event.target.value) })} className="flex-1" /><span className="control-value">{text.bgRadius || 8}</span></div>
          </div>
        )}
        <label className="toggle-row mt-3">
          <input type="checkbox" checked={text.strokeEnabled || false} onChange={(event) => onUpdate({ strokeEnabled: event.target.checked })} />
          Contorno
        </label>
        {text.strokeEnabled && (
          <div className="flex items-center gap-2 mt-2">
            <input type="color" value={text.strokeColor || '#000000'} onChange={(event) => onUpdate({ strokeColor: event.target.value })} className="w-8 h-7 rounded-md bg-transparent" aria-label="Color del contorno" />
            <span className="control-label flex-1">Grosor</span>
            <input type="range" min="1" max="8" step="1" value={text.strokeWidth || 2} onChange={(event) => onUpdate({ strokeWidth: Number(event.target.value) })} className="w-24" />
          </div>
        )}
      </InspectorSection>

      <button type="button" onClick={onDelete} className="w-full h-9 rounded-lg border border-red-500/20 bg-red-500/[0.06] text-[11px] font-semibold text-red-300 hover:bg-red-500/10 transition-colors">
        Eliminar texto
      </button>
    </div>
  );
}

export default function PropertiesPanel({
  meta,
  onMetaChange,
  activeClip,
  activeFile,
  activeClipIndex = -1,
  selectedTextId,
  onSelectText,
  onAddText,
  onUpdateText,
  onDeleteText,
  onSpeedChange,
  onAudioChange,
  onPipChange,
  onCollaborativeRatingChange,
  onTrimChange,
  onTransformChange,
  onSeek,
  files,
  currentOffset,
  onClose,
  embedded,
}) {
  const texts = activeClip?.texts || [];
  const selectedText = texts.find((text) => text.id === selectedTextId) || null;
  const clipDuration = activeClip ? Math.max(0, activeClip.sourceEnd - activeClip.sourceStart) : 0;
  const animationTypes = getAnimationTypes();
  const rankingEnabled = meta?.collaborativeRanking?.enabled === true;
  const updateBlur = (key, value) => onMetaChange({ ...meta, [key]: value });

  return (
    <aside className="w-full h-full flex flex-col studio-sidebar backdrop-blur-xl border-l border-glass-border shrink-0">
      <div className="h-14 px-3.5 flex items-center gap-3 border-b border-glass-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-accent-soft border border-accent/20 flex items-center justify-center text-signal font-mono text-[10px] font-bold">
          {selectedText ? 'TXT' : activeClip ? String(activeClipIndex + 1).padStart(2, '0') : '--'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-neutral-600">Inspector</div>
          <div className="text-xs font-semibold text-neutral-100 truncate">
            {selectedText ? 'Texto seleccionado' : activeClip ? `Clip ${activeClipIndex + 1}` : 'Sin selección'}
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg text-neutral-500 hover:text-neutral-100 hover:bg-white/5 focus-ring" title="Cerrar inspector" aria-label="Cerrar inspector">×</button>
        )}
      </div>

      {activeClip && (
        <div className="px-3 py-2 border-b border-glass-border bg-black/10 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[9px] text-neutral-500 truncate" title={activeFile?.name || ''}>{activeFile?.name || 'Clip sin medio'}</span>
            {selectedText && <button type="button" onClick={() => onSelectText(null)} className="text-[9px] font-semibold text-accent hover:text-signal">Volver al clip</button>}
          </div>
          <TextPicker texts={texts} selectedTextId={selectedTextId} onSelectText={onSelectText} onAddText={onAddText} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {!activeClip ? (
          <div className="h-full min-h-44 flex items-center justify-center text-center px-6">
            <div>
              <div className="w-10 h-10 mx-auto rounded-xl border border-dashed border-accent/30 bg-accent/[0.06] flex items-center justify-center text-accent mb-3">◇</div>
              <p className="text-xs font-semibold text-neutral-300">Selecciona un clip</p>
              <p className="text-[10px] text-neutral-600 mt-1 leading-relaxed">Sus propiedades aparecerán aquí automáticamente.</p>
            </div>
          </div>
        ) : selectedText ? (
          <SelectedTextEditor
            text={selectedText}
            clipDuration={clipDuration}
            animationTypes={animationTypes}
            onUpdate={(patch) => onUpdateText(selectedText.id, patch)}
            onDelete={() => onDeleteText(selectedText.id)}
          />
        ) : (
          <div className="flex flex-col gap-2.5 animate-fade-in">
            <InspectorSection title="Lienzo" eyebrow="9:16" defaultOpen>
              <label className="toggle-row">
                <input type="checkbox" checked={meta.blurEnabled !== false} onChange={(event) => updateBlur('blurEnabled', event.target.checked)} />
                Fondo desenfocado
              </label>
              {meta.blurEnabled !== false && (
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="control-label w-12">Intensidad</span>
                  <input type="range" min="0" max="120" step="5" value={meta.blur ?? 30} onChange={(event) => updateBlur('blur', Number(event.target.value))} className="flex-1" />
                  <span className="control-value">{meta.blur ?? 30}</span>
                </div>
              )}
            </InspectorSection>

            <InspectorSection title="Transformación" defaultOpen>
              <ClipTransformControls transform={activeClip.transform || { x: 0, y: 0, scale: 1 }} onTransformChange={onTransformChange} />
            </InspectorSection>

            <InspectorSection title="Recorte" defaultOpen>
              {activeFile ? <ClipTrim clip={activeClip} file={activeFile} currentOffset={currentOffset} onChange={onTrimChange} onSeek={onSeek} /> : <p className="text-[10px] text-neutral-500">El archivo de este clip no está disponible.</p>}
            </InspectorSection>

            <InspectorSection title="Velocidad">
              <SpeedPicker speed={activeClip.speed || 1} onChange={onSpeedChange} />
            </InspectorSection>

            <InspectorSection title="Audio">
              <AudioPanel audio={activeClip.audio || { volume: 1, mute: false, fadeIn: 0, fadeOut: 0 }} onChange={onAudioChange} />
            </InspectorSection>

            <InspectorSection title="Imagen sobre imagen" eyebrow="PIP">
              <PipPicker pip={activeClip.pip || { enabled: false, fileId: null, position: 'bottom-right', size: 30, opacity: 1, border: true, borderWidth: 4, borderRadius: 8 }} files={files} onChange={onPipChange} />
            </InspectorSection>

            {rankingEnabled && (
              <InspectorSection title="Ranking colaborativo">
                <CollaborativeRankingPanel meta={meta} activeClip={activeClip} onMetaChange={onMetaChange} onRatingChange={onCollaborativeRatingChange} />
              </InspectorSection>
            )}
          </div>
        )}
      </div>
      {!embedded && <div className="h-0.5 bg-gradient-to-r from-transparent via-flare/60 to-transparent shrink-0" />}
    </aside>
  );
}
