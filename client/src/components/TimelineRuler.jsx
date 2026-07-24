import { useRef, useState, useCallback } from 'react';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TimelineRuler({ totalDuration, onSeek, currentGlobalTime, timelineZoom, snapPoints }) {
  const rulerRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const getTimeFromX = useCallback((clientX) => {
    const el = rulerRef.current;
    if (!el || totalDuration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let time = pct * totalDuration;
    if (snapPoints && snapPoints.length > 0) {
      const threshold = 0.15;
      for (const p of snapPoints) {
        if (Math.abs(time - p) <= threshold) {
          time = p;
          break;
        }
      }
    }
    return time;
  }, [totalDuration, snapPoints]);

  const handlePointerDown = useCallback((e) => {
    setDragging(true);
    rulerRef.current?.setPointerCapture(e.pointerId);
    onSeek(getTimeFromX(e.clientX));
  }, [getTimeFromX, onSeek]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    onSeek(getTimeFromX(e.clientX));
  }, [dragging, getTimeFromX, onSeek]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  const playheadPct = totalDuration > 0 ? ((currentGlobalTime || 0) / totalDuration) * 100 : 0;

  const tickInterval = (() => {
    const visibleDuration = totalDuration / Math.max(1, timelineZoom);
    if (visibleDuration <= 10) return 1;
    if (visibleDuration <= 30) return 5;
    if (visibleDuration <= 120) return 10;
    if (visibleDuration <= 600) return 30;
    return 60;
  })();

  const ticks = [];
  for (let t = 0; t <= totalDuration; t += tickInterval) {
    ticks.push(t);
  }

  return (
    <div className="relative h-6 bg-editor-surface border-b border-editor-border select-none">
      <div ref={rulerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 cursor-pointer touch-none overflow-hidden">
        {ticks.map((t) => {
          const pct = (t / totalDuration) * 100;
          return (
            <div key={t} className="absolute top-0 bottom-0" style={{ left: `${pct}%` }}>
              <div className="w-px h-full bg-editor-border" />
              <span className="absolute top-0.5 left-1 text-[8px] font-mono text-neutral-500 whitespace-nowrap">
                {formatTime(t)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="absolute top-0 bottom-0 w-px bg-accent pointer-events-none z-10"
        style={{ left: `${playheadPct}%` }} />
      <div className="absolute -top-0.5 w-2 h-2 bg-accent rounded-full pointer-events-none z-10 -ml-1"
        style={{ left: `${playheadPct}%` }} />
    </div>
  );
}
