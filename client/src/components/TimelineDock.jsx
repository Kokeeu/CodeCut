import { useEffect, useLayoutEffect, useRef } from 'react';
import ResizeHandle from './ResizeHandle.jsx';
import TransportBar from './TransportBar.jsx';
import TimelineRuler from './TimelineRuler.jsx';
import ClipTrack from './ClipTrack.jsx';
import { getWheelZoom, getZoomScrollLeft } from '../lib/timelineScale.js';

export default function TimelineDock({
  height,
  onHeightChange,
  onHeightReset,
  transport,
  ruler,
  track,
}) {
  const dockRef = useRef(null);
  const zoomRef = useRef(transport.timelineZoom);
  const pendingScrollRef = useRef(null);
  const { timelineZoom, onTimelineZoomChange } = transport;
  const { scrollContainer } = ruler;

  useLayoutEffect(() => {
    zoomRef.current = timelineZoom;
    if (scrollContainer && pendingScrollRef.current !== null) {
      scrollContainer.scrollLeft = pendingScrollRef.current;
      pendingScrollRef.current = null;
    }
  }, [timelineZoom, scrollContainer]);

  useEffect(() => {
    const dock = dockRef.current;
    if (!dock || !scrollContainer || !onTimelineZoomChange) return;
    const handleWheel = (event) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.deltaY === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const zoom = zoomRef.current;
      const nextZoom = getWheelZoom(zoom, event.deltaY, event.deltaMode);
      if (nextZoom === zoom) return;
      const rect = scrollContainer.getBoundingClientRect();
      const padding = parseFloat(getComputedStyle(scrollContainer).paddingLeft) || 0;
      const pointerX = Math.max(0, Math.min(scrollContainer.clientWidth, event.clientX - rect.left - scrollContainer.clientLeft) - padding);
      const scrollLeft = pendingScrollRef.current ?? scrollContainer.scrollLeft;
      pendingScrollRef.current = getZoomScrollLeft(scrollLeft, pointerX, zoom, nextZoom);
      zoomRef.current = nextZoom;
      onTimelineZoomChange(nextZoom);
    };
    dock.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => dock.removeEventListener('wheel', handleWheel, true);
  }, [scrollContainer, onTimelineZoomChange]);

  return (
    <section ref={dockRef} className="relative flex flex-col studio-timeline border-t shrink-0 backdrop-blur-md h-[var(--timeline-height)] max-md:h-44" style={{ '--timeline-height': `${height}px` }} aria-label="Línea de tiempo">
      <div className="max-md:hidden">
        <ResizeHandle
          orientation="horizontal"
          value={height}
          min={180}
          max={420}
          onChange={onHeightChange}
          onReset={onHeightReset}
          label="Redimensionar línea de tiempo"
          reverse
        />
      </div>
      <TransportBar {...transport} />
      <TimelineRuler {...ruler} />
      <div className="flex-1 min-h-0 overflow-y-hidden px-2 py-1.5">
        <ClipTrack {...track} />
      </div>
    </section>
  );
}
