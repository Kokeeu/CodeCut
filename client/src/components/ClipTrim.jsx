import { useCallback, useEffect, useRef, useState } from 'react';

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

const MIN_GAP = 0.1;

export default function ClipTrim({ clip, fileDuration, currentOffset, onChange, onSeek }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const safeDuration = Math.max(0.01, fileDuration || 0.01);
  const startPct = (clip.sourceStart / safeDuration) * 100;
  const endPct = (clip.sourceEnd / safeDuration) * 100;
  const playheadPct = clamp(((clip.sourceStart + currentOffset) / safeDuration) * 100, 0, 100);

  const updateFromEvent = useCallback((e) => {
    if (!dragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const t = pct * safeDuration;

    if (dragging === 'start') {
      onChange({ sourceStart: clamp(t, 0, clip.sourceEnd - MIN_GAP), sourceEnd: clip.sourceEnd });
    } else if (dragging === 'end') {
      onChange({ sourceStart: clip.sourceStart, sourceEnd: clamp(t, clip.sourceStart + MIN_GAP, safeDuration) });
    } else if (dragging === 'seek') {
      const clamped = clamp(t, clip.sourceStart, clip.sourceEnd);
      onSeek?.(clamped - clip.sourceStart);
    }
  }, [dragging, safeDuration, clip.sourceStart, clip.sourceEnd, onChange, onSeek]);

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
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const t = clamp(pct * safeDuration, clip.sourceStart, clip.sourceEnd);
    onSeek?.(t - clip.sourceStart);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
        <span>In: {formatTime(clip.sourceStart)}</span>
        <span>Clip: {formatTime(Math.max(0, clip.sourceEnd - clip.sourceStart))}</span>
        <span>Out: {formatTime(clip.sourceEnd)}</span>
      </div>
      <div
        ref={trackRef}
        onMouseDown={onTrackMouseDown}
        className="relative h-14 rounded-xl bg-slate-800 cursor-pointer select-none"
      >
        <div
          className="absolute top-0 bottom-0 bg-indigo-500/20 border-x-2 border-indigo-400 pointer-events-none"
          style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 pointer-events-none"
          style={{ left: `${playheadPct}%` }}
        />
        <div
          onMouseDown={(e) => { e.stopPropagation(); setDragging('start'); }}
          className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize bg-indigo-400 hover:bg-indigo-300 rounded-sm z-10"
          style={{ left: `${startPct}%` }}
          title="Trim start"
        />
        <div
          onMouseDown={(e) => { e.stopPropagation(); setDragging('end'); }}
          className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize bg-indigo-400 hover:bg-indigo-300 rounded-sm z-10"
          style={{ left: `${endPct}%` }}
          title="Trim end"
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
        <span>0:00</span>
        <span>{formatTime(safeDuration)}</span>
      </div>
    </div>
  );
}
