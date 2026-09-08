import ResizeHandle from './ResizeHandle.jsx';
import TransportBar from './TransportBar.jsx';
import TimelineRuler from './TimelineRuler.jsx';
import ClipTrack from './ClipTrack.jsx';

export default function TimelineDock({
  height,
  onHeightChange,
  onHeightReset,
  transport,
  ruler,
  track,
}) {
  return (
    <section className="relative flex flex-col studio-timeline border-t shrink-0 backdrop-blur-md h-[var(--timeline-height)] max-md:h-44" style={{ '--timeline-height': `${height}px` }} aria-label="Línea de tiempo">
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
