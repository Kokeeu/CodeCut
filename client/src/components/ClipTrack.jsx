import { useRef } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import ClipBlock from './ClipBlock.jsx';
import TransitionPicker from './TransitionPicker.jsx';

const PX_PER_SEC = 26;
const MIN_WIDTH = 72;

export default function ClipTrack({
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
  onTimelineZoomChange,
}) {
  const containerRef = useRef(null);
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
    if (!e.ctrlKey || !onTimelineZoomChange) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.5 : 0.5;
    onTimelineZoomChange(timelineZoom + delta);
  };

  if (clips.length === 0) {
    return (
      <p className="text-xs text-neutral-500 py-6 text-center">
        Timeline is empty — add a clip from the media pool.
      </p>
    );
  }

  const effectivePxPerSec = PX_PER_SEC * Math.max(0.1, Math.min(20, timelineZoom || 1));

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={clips.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          <div
            ref={containerRef}
            onWheel={handleWheel}
            className="flex items-stretch overflow-x-auto pb-2 pt-1"
          >
            {clips.map((clip, i) => {
              const dur = clip.sourceEnd - clip.sourceStart;
              const width = Math.max(MIN_WIDTH, dur * effectivePxPerSec);
              const nextClip = clips[i + 1];
              const seamMaxDur = nextClip
                ? Math.max(0, Math.min(dur, nextClip.sourceEnd - nextClip.sourceStart) - 0.1)
                : 0;
              return (
                <div key={clip.id} className="flex items-stretch shrink-0">
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
      <div className="flex items-center gap-2 mt-2 px-1">
        <span className="text-[10px] text-neutral-500">Zoom</span>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={timelineZoom}
          onChange={(e) => onTimelineZoomChange?.(Number(e.target.value))}
          className="flex-1 h-1"
        />
        <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
          {timelineZoom.toFixed(1)}x
        </span>
      </div>
    </div>
  );
}
