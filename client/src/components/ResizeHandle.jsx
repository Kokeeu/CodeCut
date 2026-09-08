import { useCallback, useRef } from 'react';

export default function ResizeHandle({
  orientation,
  value,
  min,
  max,
  onChange,
  onReset,
  label,
  reverse = false,
}) {
  const dragRef = useRef(null);
  const vertical = orientation === 'vertical';

  const clamp = useCallback((nextValue) => {
    return Math.min(max, Math.max(min, nextValue));
  }, [max, min]);

  const handlePointerDown = useCallback((event) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      start: vertical ? event.clientX : event.clientY,
      value,
    };
  }, [value, vertical]);

  const handlePointerMove = useCallback((event) => {
    if (!dragRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const position = vertical ? event.clientX : event.clientY;
    const delta = (position - dragRef.current.start) * (reverse ? -1 : 1);
    onChange(clamp(dragRef.current.value + delta));
  }, [clamp, onChange, reverse, vertical]);

  const handlePointerUp = useCallback((event) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleKeyDown = useCallback((event) => {
    const step = event.shiftKey ? 24 : 8;
    let direction = 0;
    if (vertical && event.key === 'ArrowLeft') direction = -1;
    if (vertical && event.key === 'ArrowRight') direction = 1;
    if (!vertical && event.key === 'ArrowUp') direction = 1;
    if (!vertical && event.key === 'ArrowDown') direction = -1;
    if (!direction) return;
    event.preventDefault();
    onChange(clamp(value + direction * step));
  }, [clamp, onChange, value, vertical]);

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={[
        'group relative z-40 shrink-0 touch-none outline-none',
        vertical ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
      ].join(' ')}
    >
      <span className={[
        'absolute bg-transparent group-hover:bg-accent/70 group-focus-visible:bg-signal transition-colors',
        vertical ? 'inset-y-0 -left-0.5 w-1.5' : 'inset-x-0 -top-0.5 h-1.5',
      ].join(' ')} />
    </div>
  );
}
