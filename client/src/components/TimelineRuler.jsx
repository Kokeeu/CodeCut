import { useEffect, useRef, useState, useCallback } from 'react';
import { getEffectivePxPerSec, getPlayheadLeft } from '../lib/timelineScale.js';

function useSyncedScroll(scrollContainer) {
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (!scrollContainer) return;
    const sync = () => setScrollLeft(scrollContainer.scrollLeft);
    scrollContainer.addEventListener('scroll', sync);
    sync();
    return () => scrollContainer.removeEventListener('scroll', sync);
  }, [scrollContainer]);

  return scrollLeft;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TimelineRuler({
  totalDuration,
  onSeek,
  currentGlobalTime,
  timelineZoom,
  trackWidth,
  scrollContainer,
  snapPoints,
  clips,
  transitions,
}) {
  const rulerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const effectivePxPerSec = getEffectivePxPerSec(timelineZoom);
  const scrollLeft = useSyncedScroll(scrollContainer);

  const getTimeFromX = useCallback((clientX) => {
    const el = rulerRef.current;
    if (!el || totalDuration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + scrollLeft;
    let time = Math.max(0, Math.min(totalDuration, (x / Math.max(1, trackWidth)) * totalDuration));
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
  }, [totalDuration, trackWidth, scrollLeft, snapPoints]);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    setDragging(true);
    rulerRef.current?.setPointerCapture(e.pointerId);
    onSeek(getTimeFromX(e.clientX));
  }, [getTimeFromX, onSeek]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging || e.buttons === 0) return;
    onSeek(getTimeFromX(e.clientX));
  }, [dragging, getTimeFromX, onSeek]);

  const handlePointerUp = useCallback(() => setDragging(false), []);
  const handlePointerLeave = useCallback(() => setDragging(false), []);

  const playheadLeft = clips && transitions
    ? getPlayheadLeft(clips, transitions, currentGlobalTime || 0, timelineZoom) - scrollLeft
    : (currentGlobalTime || 0) * effectivePxPerSec - scrollLeft;

  const tickInterval = (() => {
    const targetPx = 80;
    const secondsPerTick = targetPx / effectivePxPerSec;
    if (secondsPerTick <= 1) return 1;
    if (secondsPerTick <= 2.5) return 2;
    if (secondsPerTick <= 5) return 5;
    if (secondsPerTick <= 15) return 10;
    if (secondsPerTick <= 40) return 30;
    return 60;
  })();

  const ticks = [];
  for (let t = 0; t <= totalDuration; t += tickInterval) {
    ticks.push(t);
  }

  return (
    <div
      ref={rulerRef}
      className="relative h-7 bg-glass-panel border-b border-glass-border select-none backdrop-blur-sm overflow-x-hidden"
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="absolute top-0 bottom-0 left-0 cursor-pointer touch-none"
        style={{ width: Math.max(0, trackWidth), transform: `translateX(-${scrollLeft}px)` }}
      >
        {ticks.map((t, i) => {
          const left = totalDuration > 0 ? (t / totalDuration) * trackWidth : 0;
          const isMajor = i % 5 === 0;
          return (
            <div key={t} className="absolute top-0 bottom-0" style={{ left }}>
              <div className={['w-px h-full', isMajor ? 'bg-white/15' : 'bg-white/5'].join(' ')} />
              {isMajor && (
                <span className="absolute top-1 left-1.5 text-[9px] font-mono text-neutral-400 whitespace-nowrap tracking-tight">
                  {formatTime(t)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="absolute top-0 bottom-0 w-px bg-accent pointer-events-none z-10"
        style={{
          left: playheadLeft,
          boxShadow: '0 0 8px rgba(168, 85, 247, 0.8)',
        }}
      />
      <div
        className="absolute -top-1 w-2.5 h-2.5 bg-accent rounded-full pointer-events-none z-10 -ml-1"
        style={{
          left: playheadLeft,
          boxShadow: '0 0 12px rgba(168, 85, 247, 0.9), 0 0 4px rgba(192, 132, 252, 1)',
        }}
      />
    </div>
  );
}
