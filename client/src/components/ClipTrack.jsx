import { forwardRef, useRef, useState, useEffect } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import ClipBlock from './ClipBlock.jsx';
import TransitionPicker from './TransitionPicker.jsx';
import {
  getEffectivePxPerSec,
  MIN_CLIP_WIDTH,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  WHEEL_ZOOM_STEP,
} from '../lib/timelineScale.js';

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
    transitions,
    fileById,
    onSelect,
    onDelete,
    onDuplicate,
    onReorder,
    onTransitionChange,
    timelineZoom = 1,
    trackWidth,
    onTimelineZoomChange,
  },
  forwardedRef
) {
  const containerRef = useRef(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: clips.length });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = clips.findIndex((c) => c.id === active.id);
    const newIndex = clips.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(clips, oldIndex, newIndex));
  };

  const handleWheel = (e) => {
    const container = containerRef.current;
    if (!container) return;
    e.preventDefault();

    if (e.ctrlKey && onTimelineZoomChange) {
      const delta = e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP;
      onTimelineZoomChange(timelineZoom + delta);
      return;
    }

    container.scrollLeft += e.deltaY;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const scrollLeft = container.scrollLeft;
      const clientWidth = container.clientWidth;
      const effectivePxPerSec = getEffectivePxPerSec(timelineZoom);

      let cumWidth = 0;
      let startIdx = 0;
      let endIdx = clips.length;

      for (let i = 0; i < clips.length; i++) {
        const dur = clips[i].sourceEnd - clips[i].sourceStart;
        const width = Math.max(MIN_CLIP_WIDTH, dur * effectivePxPerSec);

        if (cumWidth + width > scrollLeft - 200 && startIdx === 0) {
          startIdx = Math.max(0, i - 2);
        }

        if (cumWidth > scrollLeft + clientWidth + 200) {
          endIdx = Math.min(clips.length, i + 2);
          break;
        }

        cumWidth += width;
      }

      setVisibleRange({ start: startIdx, end: endIdx });
    };

    updateVisibleRange();
    container.addEventListener('scroll', updateVisibleRange);

    return () => container.removeEventListener('scroll', updateVisibleRange);
  }, [clips, timelineZoom]);

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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={clips.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <div
            ref={containerRef}
            onWheel={handleWheel}
            className="flex items-center overflow-x-auto pb-2 pt-2 px-1 scrollbar-thin"
            style={{
              minWidth: trackWidth ? Math.max(0, trackWidth) : undefined,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            {visibleClips.map((clip, idx) => {
              const i = visibleRange.start + idx;
              const dur = clip.sourceEnd - clip.sourceStart;
              const width = Math.max(MIN_CLIP_WIDTH, dur * effectivePxPerSec);
              const nextClip = clips[i + 1];
              const seamMaxDur = nextClip
                ? Math.max(0, Math.min(dur, nextClip.sourceEnd - nextClip.sourceStart) - 0.1)
                : 0;
              return (
                <div key={clip.id} className="flex items-center shrink-0">
                  <ClipBlock
                    clip={clip}
                    index={i}
                    width={width}
                    file={fileById[clip.fileId]}
                    isActive={clip.id === activeClipId}
                    canDelete={clips.length > 1}
                    onSelect={() => onSelect(clip.id)}
                    onDelete={() => onDelete(clip.id)}
                    onDuplicate={() => onDuplicate?.(clip.id)}
                  />
                  {nextClip && (
                    <TransitionPicker
                      value={transitions[i] || { type: 'none', durationSec: 0 }}
                      maxDuration={seamMaxDur}
                      onChange={(v) => onTransitionChange(i, v)}
                    />
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
