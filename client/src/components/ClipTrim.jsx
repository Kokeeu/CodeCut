import { useCallback, useEffect, useRef, useState } from 'react';

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00.0';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

function formatTimeInput(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00:00.000';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

function parseTimeInput(str) {
  const trimmed = str.trim();
  if (!trimmed) return 0;
  
  const parts = trimmed.split(':');
  
  if (parts.length === 3) {
    const h = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    const s = parseFloat(parts[2]) || 0;
    return h * 3600 + m * 60 + s;
  } else if (parts.length === 2) {
    const m = parseFloat(parts[0]) || 0;
    const s = parseFloat(parts[1]) || 0;
    return m * 60 + s;
  } else {
    return parseFloat(trimmed) || 0;
  }
}

const MIN_GAP = 0.1;
const FRAME_DURATION = 1 / 30;

export default function ClipTrim({ clip, file, currentOffset, onChange, onSeek }) {
  const trackRef = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [trimZoom, setTrimZoom] = useState(1);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  const fileDuration = file?.duration || 0;
  const waveform = file?.waveform;
  const safeDuration = Math.max(0.01, fileDuration || 0.01);
  
  const startPct = (clip.sourceStart / safeDuration) * 100;
  const endPct = (clip.sourceEnd / safeDuration) * 100;
  const playheadPct = clamp(((clip.sourceStart + currentOffset) / safeDuration) * 100, 0, 100);

  const getTimeFromEvent = useCallback((e) => {
    if (!trackRef.current || !containerRef.current) return 0;
    const trackRect = trackRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calcular la posición del click relativa al track completo
    const clickX = e.clientX - trackRect.left;
    const trackWidth = trackRect.width;
    const pct = clamp(clickX / trackWidth, 0, 1);
    const t = pct * safeDuration;
    return t;
  }, [safeDuration]);

  const updateFromEvent = useCallback((e) => {
    if (!dragging) return;
    const t = getTimeFromEvent(e);

    if (dragging === 'start') {
      onChange({ sourceStart: clamp(t, 0, clip.sourceEnd - MIN_GAP), sourceEnd: clip.sourceEnd });
    } else if (dragging === 'end') {
      onChange({ sourceStart: clip.sourceStart, sourceEnd: clamp(t, clip.sourceStart + MIN_GAP, safeDuration) });
    } else if (dragging === 'seek') {
      const clamped = clamp(t, clip.sourceStart, clip.sourceEnd);
      onSeek?.(clamped - clip.sourceStart);
    }
  }, [dragging, getTimeFromEvent, clip.sourceStart, clip.sourceEnd, onChange, onSeek, safeDuration]);

  useEffect(() => {
    if (!dragging) return undefined;
    const onMove = (e) => updateFromEvent(e);
    const onUp = () => setDragging(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, updateFromEvent]);

  const onTrackMouseDown = (e) => {
    setDragging('seek');
    const t = getTimeFromEvent(e);
    const clamped = clamp(t, clip.sourceStart, clip.sourceEnd);
    onSeek?.(clamped - clip.sourceStart);
  };

  const handleScroll = (e) => {
    setScrollLeft(e.target.scrollLeft);
  };

  const handleTimeInput = (handle, value) => {
    const t = parseTimeInput(value);
    if (handle === 'start') {
      onChange({ sourceStart: clamp(t, 0, clip.sourceEnd - MIN_GAP), sourceEnd: clip.sourceEnd });
    } else {
      onChange({ sourceStart: clip.sourceStart, sourceEnd: clamp(t, clip.sourceStart + MIN_GAP, safeDuration) });
    }
  };

  const adjustFrame = (handle, direction) => {
    const delta = direction * FRAME_DURATION;
    if (handle === 'start') {
      const newStart = clamp(clip.sourceStart + delta, 0, clip.sourceEnd - MIN_GAP);
      onChange({ sourceStart: newStart, sourceEnd: clip.sourceEnd });
    } else {
      const newEnd = clamp(clip.sourceEnd + delta, clip.sourceStart + MIN_GAP, safeDuration);
      onChange({ sourceStart: clip.sourceStart, sourceEnd: newEnd });
    }
  };

  const setInPoint = () => {
    const newStart = clip.sourceStart + currentOffset;
    onChange({ sourceStart: clamp(newStart, 0, clip.sourceEnd - MIN_GAP), sourceEnd: clip.sourceEnd });
  };

  const setOutPoint = () => {
    const newEnd = clip.sourceStart + currentOffset;
    onChange({ sourceStart: clip.sourceStart, sourceEnd: clamp(newEnd, clip.sourceStart + MIN_GAP, safeDuration) });
  };

  const trackWidth = trimZoom * 100;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustFrame('start', -1)}
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              title="Retroceder 1 frame"
            >
              ◀
            </button>
            <label className="text-xs text-slate-400 w-8">In:</label>
            <input
              type="text"
              value={formatTimeInput(clip.sourceStart)}
              onChange={(e) => handleTimeInput('start', e.target.value)}
              className="w-28 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono focus:border-indigo-400 focus:outline-none"
            />
            <button
              onClick={() => adjustFrame('start', 1)}
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              title="Avanzar 1 frame"
            >
              ▶
            </button>
          </div>
          <button
            onClick={setInPoint}
            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium"
            title="Marcar punto actual como inicio"
          >
            Set In
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustFrame('end', -1)}
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              title="Retroceder 1 frame"
            >
              ◀
            </button>
            <label className="text-xs text-slate-400 w-8">Out:</label>
            <input
              type="text"
              value={formatTimeInput(clip.sourceEnd)}
              onChange={(e) => handleTimeInput('end', e.target.value)}
              className="w-28 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 font-mono focus:border-indigo-400 focus:outline-none"
            />
            <button
              onClick={() => adjustFrame('end', 1)}
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              title="Avanzar 1 frame"
            >
              ▶
            </button>
          </div>
          <button
            onClick={setOutPoint}
            className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium"
            title="Marcar punto actual como fin"
          >
            Set Out
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono text-center">
          Duration: {formatTime(Math.max(0, clip.sourceEnd - clip.sourceStart))}
        </div>
      </div>

      <div className="overflow-x-auto" ref={containerRef} onScroll={handleScroll}>
        <div
          ref={trackRef}
          onMouseDown={onTrackMouseDown}
          className="relative h-16 rounded-xl bg-slate-800 cursor-pointer select-none"
          style={{ width: `${trackWidth}%`, minWidth: '100%' }}
        >
          {waveform && (
            <div className="absolute inset-0 flex items-center gap-px px-1 pointer-events-none opacity-40">
              {waveform.map((peak, i) => (
                <div
                  key={i}
                  className="flex-1 bg-slate-400 rounded-t"
                  style={{ height: `${Math.max(2, peak * 100)}%` }}
                />
              ))}
            </div>
          )}

          <div
            className="absolute top-0 bottom-0 bg-indigo-500/20 border-x border-indigo-400 pointer-events-none"
            style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
          />

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 pointer-events-none"
            style={{ left: `${playheadPct}%` }}
          />

          <div
            onMouseDown={(e) => { e.stopPropagation(); setDragging('start'); }}
            className="absolute top-0 bottom-0 w-0.5 -ml-0.5 cursor-ew-resize bg-indigo-400 hover:bg-indigo-300 hover:w-1 hover:-ml-1 z-10 transition-all"
            style={{ left: `${startPct}%` }}
            title="Trim start"
          />

          <div
            onMouseDown={(e) => { e.stopPropagation(); setDragging('end'); }}
            className="absolute top-0 bottom-0 w-0.5 -ml-0.5 cursor-ew-resize bg-indigo-400 hover:bg-indigo-300 hover:w-1 hover:-ml-1 z-10 transition-all"
            style={{ left: `${endPct}%` }}
            title="Trim end"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
        <span>0:00</span>
        <span>{formatTime(safeDuration)}</span>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-slate-500 shrink-0">Zoom</span>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={trimZoom}
          onChange={(e) => setTrimZoom(Number(e.target.value))}
          className="flex-1 accent-indigo-500 h-1"
        />
        <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
          {trimZoom.toFixed(1)}x
        </span>
      </div>
    </div>
  );
}
