import { useRef, useState, useCallback, useEffect } from 'react';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

export default function TimelineScrubber({
  clips,
  transitions,
  activeClipId,
  totalDuration,
  onSeek,
}) {
  const barRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const cumulativeStarts = (() => {
    const starts = [];
    let cum = 0;
    for (let i = 0; i < clips.length; i++) {
      starts.push(cum);
      const dur = (clips[i].sourceEnd - clips[i].sourceStart) / (clips[i].speed || 1);
      cum += dur;
      if (i < clips.length - 1) {
        const t = transitions[i];
        if (t && t.type && t.type !== 'none') {
          cum -= Number(t.durationSec) || 0;
        }
      }
    }
    return starts;
  })();

  const globalOffset = (() => {
    let offset = 0;
    for (let i = 0; i < clips.length; i++) {
      if (clips[i].id === activeClipId) {
        return cumulativeStarts[i] + offset;
      }
    }
    return 0;
  })();

  const getTimeFromX = useCallback((clientX) => {
    const bar = barRef.current;
    if (!bar || totalDuration <= 0) return 0;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * totalDuration;
  }, [totalDuration]);

  const handlePointerDown = useCallback((e) => {
    setDragging(true);
    barRef.current?.setPointerCapture(e.pointerId);
    const time = getTimeFromX(e.clientX);
    onSeek(time);
  }, [getTimeFromX, onSeek]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    const time = getTimeFromX(e.clientX);
    onSeek(time);
  }, [dragging, getTimeFromX, onSeek]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const playheadPct = totalDuration > 0 ? (globalOffset / totalDuration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1">
      <div
        ref={barRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative h-8 rounded-lg bg-slate-800 cursor-pointer select-none overflow-hidden touch-none"
      >
        {clips.map((clip, i) => {
          const start = cumulativeStarts[i];
          const dur = (clip.sourceEnd - clip.sourceStart) / (clip.speed || 1);
          const leftPct = (start / totalDuration) * 100;
          const widthPct = (dur / totalDuration) * 100;
          const isActive = clip.id === activeClipId;
          return (
            <div
              key={clip.id}
              className={[
                'absolute top-0 bottom-0 border-r border-slate-600',
                isActive ? 'bg-indigo-500/20' : 'bg-slate-700/30',
              ].join(' ')}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            >
              <span className="absolute top-0.5 left-1 text-[8px] font-mono text-slate-400 truncate max-w-full">
                #{i + 1}
              </span>
            </div>
          );
        })}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-green-400 pointer-events-none z-10"
          style={{ left: `${playheadPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1">
        <span>0:00.0</span>
        <span>{formatTime(globalOffset)}</span>
        <span>{formatTime(totalDuration)}</span>
      </div>
    </div>
  );
}
