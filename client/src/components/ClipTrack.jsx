import { forwardRef, useRef, useState, useEffect, useCallback } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import ClipBlock from './ClipBlock.jsx';
import TransitionPicker from './TransitionPicker.jsx';
import {
  getEffectivePxPerSec,
  getPlayheadLeft,
  MIN_CLIP_WIDTH,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  WHEEL_ZOOM_STEP,
} from '../lib/timelineScale.js';
import { clipOutputDuration, transitionDuration } from '../lib/transitions.js';

function ZoomInIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 7.5L10 10M5 3.5v3M3.5 5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7.5 7.5L10 10M3.5 5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const ClipTrack = forwardRef(function ClipTrack(
  {
    clips,
    activeClipId,
    incomingClipId,
    transitions,
    fileById,
    onSelect,
    onDelete,
    onDuplicate,
    onReorder,
    onTransitionChange,
    timelineZoom = 1,
    onTimelineZoomChange,
    currentGlobalTime = 0,
    isPlaying = false,
  },
  forwardedRef
) {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: clips.length });
  const dragAutoScrollRef = useRef({ rafId: null, dir: 0, speed: 0 });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const stopDragAutoScroll = useCallback(() => {
    if (dragAutoScrollRef.current.rafId) {
      cancelAnimationFrame(dragAutoScrollRef.current.rafId);
      dragAutoScrollRef.current.rafId = null;
    }
    dragAutoScrollRef.current.dir = 0;
    dragAutoScrollRef.current.speed = 0;
  }, []);

  const handleDragEnd = useCallback((event) => {
    stopDragAutoScroll();
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = clips.findIndex((c) => c.id === active.id);
    const newIndex = clips.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(clips, oldIndex, newIndex));
  }, [clips, onReorder, stopDragAutoScroll]);

  const handleDragMove = useCallback((event) => {
    const container = containerRef.current;
    if (!container) return;

    const translated = event.active?.rect?.current?.translated;
    if (!translated) return;

    const pointerX = translated.left + translated.width / 2;
    const rect = container.getBoundingClientRect();
    const EDGE = 60;
    const MAX_SPEED = 14;

    let dir = 0;
    let speed = 0;

    if (pointerX < rect.left + EDGE) {
      dir = -1;
      const dist = rect.left + EDGE - pointerX;
      speed = Math.max(1, MAX_SPEED * (dist / EDGE));
    } else if (pointerX > rect.right - EDGE) {
      dir = 1;
      const dist = pointerX - (rect.right - EDGE);
      speed = Math.max(1, MAX_SPEED * (dist / EDGE));
    }

    dragAutoScrollRef.current.dir = dir;
    dragAutoScrollRef.current.speed = speed;

    if (dir === 0) {
      if (dragAutoScrollRef.current.rafId) {
        cancelAnimationFrame(dragAutoScrollRef.current.rafId);
        dragAutoScrollRef.current.rafId = null;
      }
      return;
    }

    if (dragAutoScrollRef.current.rafId) return;

    const tick = () => {
      const s = dragAutoScrollRef.current;
      const c = containerRef.current;
      if (s.dir === 0 || !c) {
        s.rafId = null;
        return;
      }
      c.scrollLeft += s.dir * s.speed;
      s.rafId = requestAnimationFrame(tick);
    };
    dragAutoScrollRef.current.rafId = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e) => {
      if (e.ctrlKey && onTimelineZoomChange) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP;
        onTimelineZoomChange(timelineZoom + delta);
        return;
      }
      e.preventDefault();
      container.scrollLeft += e.deltaY + e.deltaX;
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, [timelineZoom, onTimelineZoomChange]);

  useEffect(() => {
    if (!isPlaying) return;
    const container = containerRef.current;
    if (!container || !clips.length) return;
    const playheadX = getPlayheadLeft(clips, transitions || [], currentGlobalTime, timelineZoom);
    const clientWidth = container.clientWidth;
    const buffer = 80;

    if (playheadX < container.scrollLeft + buffer) {
      container.scrollLeft = Math.max(0, playheadX - buffer);
    } else if (playheadX > container.scrollLeft + clientWidth - buffer) {
      container.scrollLeft = playheadX - clientWidth + buffer;
    }
  }, [currentGlobalTime, isPlaying, clips, transitions, timelineZoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const scrollLeft = container.scrollLeft;
      const clientWidth = container.clientWidth;
      const effectivePxPerSec = getEffectivePxPerSec(timelineZoom);

      let cumWidth = 0;
      let startIdx = -1;
      let endIdx = clips.length;

      for (let i = 0; i < clips.length; i++) {
        const dur = clipOutputDuration(clips[i]);
        const width = Math.max(MIN_CLIP_WIDTH, dur * effectivePxPerSec);
        const overlap = i > 0
          ? transitionDuration(transitions?.[i - 1], clips[i - 1], clips[i]) * effectivePxPerSec
          : 0;
        if (overlap > 0) cumWidth -= overlap;

        if (startIdx === -1 && cumWidth + width > scrollLeft - 200) {
          startIdx = Math.max(0, i - 2);
        }

        if (cumWidth > scrollLeft + clientWidth + 200) {
          endIdx = Math.min(clips.length, i + 2);
          break;
        }

        cumWidth += width;
      }

      if (startIdx === -1) startIdx = 0;
      setVisibleRange((prev) =>
        prev.start === startIdx && prev.end === endIdx
          ? prev
          : { start: startIdx, end: endIdx }
      );
    };

    updateVisibleRange();
    container.addEventListener('scroll', updateVisibleRange);

    return () => container.removeEventListener('scroll', updateVisibleRange);
  }, [clips, transitions, timelineZoom]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !forwardedRef) return;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else {
      forwardedRef.current = node;
    }
    return () => {
      if (typeof forwardedRef === 'function') {
        forwardedRef(null);
      } else if (forwardedRef) {
        forwardedRef.current = null;
      }
    };
  }, [forwardedRef]);

  if (clips.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-1.5 opacity-30">📽</div>
          <p className="text-xs text-neutral-500">Timeline is empty</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">Add a clip from the media pool</p>
        </div>
      </div>
    );
  }

  const effectivePxPerSec = getEffectivePxPerSec(timelineZoom);
  const visibleClips = clips.slice(visibleRange.start, visibleRange.end);

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={stopDragAutoScroll}
      >
        <SortableContext items={clips.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <div
            ref={containerRef}
            className="flex items-center overflow-x-auto pb-2 pt-2 px-1 scrollbar-thin timeline-scroll"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {visibleClips.map((clip, idx) => {
              const i = visibleRange.start + idx;
              const outDur = clipOutputDuration(clip);
              const width = Math.max(MIN_CLIP_WIDTH, outDur * effectivePxPerSec);
              const nextClip = clips[i + 1];
              const prevClip = clips[i - 1];
              const overlapIn = prevClip
                ? transitionDuration(transitions[i - 1], prevClip, clip)
                : 0;
              const overlapOut = nextClip
                ? transitionDuration(transitions[i], clip, nextClip)
                : 0;
              const overlapInPx = overlapIn * effectivePxPerSec;
              const overlapOutPx = overlapOut * effectivePxPerSec;
              const seamMaxDur = nextClip
                ? Math.max(0, Math.min(outDur, clipOutputDuration(nextClip)) - 0.02)
                : 0;
              return (
                <div
                  key={clip.id}
                  className="flex items-center shrink-0"
                  style={{ marginLeft: overlapInPx > 0 ? -overlapInPx : 0 }}
                >
                  <ClipBlock
                    clip={clip}
                    index={i}
                    width={width}
                    file={fileById[clip.fileId]}
                    isActive={clip.id === activeClipId || clip.id === incomingClipId}
                    canDelete={clips.length > 1}
                    onSelect={() => onSelect(clip.id)}
                    onDelete={() => onDelete(clip.id)}
                    onDuplicate={() => onDuplicate?.(clip.id)}
                    overlapLeft={overlapInPx}
                    overlapRight={overlapOutPx}
                  />
                  {nextClip && (
                    <div
                      className="relative shrink-0 z-20"
                      style={{ width: 0 }}
                    >
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                        style={{ left: overlapOutPx > 0 ? -overlapOutPx / 2 : 0 }}
                      >
                        <TransitionPicker
                          value={transitions[i] || { type: 'none', durationSec: 0 }}
                          maxDuration={seamMaxDur}
                          onChange={(v) => onTransitionChange(i, v)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-2 mt-1 px-1.5 py-1.5">
        <ZoomOutIcon />
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={ZOOM_STEP}
          value={timelineZoom}
          onChange={(e) => onTimelineZoomChange?.(Number(e.target.value))}
          className="flex-1"
        />
        <ZoomInIcon />
        <span className="text-[10px] font-mono text-neutral-300 w-9 text-right tabular-nums">
          {timelineZoom.toFixed(1)}x
        </span>
      </div>
    </div>
  );
});

export default ClipTrack;
