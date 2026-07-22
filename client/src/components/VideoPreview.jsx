import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { FONT_CSS } from './CardMetadata.jsx';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const CARD_H = 520;
const EXPORT_H = 1920;
const EXPORT_W = 1080;
const MAIN_Y = 360;
const DISPLAY_SCALE = CARD_H / EXPORT_H;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const CORNERS = ['nw', 'ne', 'sw', 'se'];
const CORNER_CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };

const VideoPreview = forwardRef(function VideoPreview(
  {
    clip, fileUrl, isPlaying, onTimeUpdate, onClipEnded, onPlayStateChange,
    meta, onTransformChange, selectedTextId, onSelectText, onUpdateText,
    currentOffset,
  },
  ref
) {
  const videoRef = useRef(null);
  const bgVideoRef = useRef(null);
  const cardRef = useRef(null);
  const dragRef = useRef(null);
  const textRefs = useRef({});
  const endedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const [handles, setHandles] = useState(null);

  const t = clip?.transform || { x: 0, y: 0, scale: 1 };
  const texts = clip?.texts || [];

  useImperativeHandle(ref, () => ({
    seekTo: (offsetWithinClip) => {
      const v = videoRef.current;
      const bg = bgVideoRef.current;
      const tt = clip ? clip.sourceStart + Math.max(0, offsetWithinClip) : 0;
      if (v) v.currentTime = tt;
      if (bg) bg.currentTime = tt;
    },
  }), [clip]);

  useEffect(() => {
    endedRef.current = false;
    const v = videoRef.current;
    const bg = bgVideoRef.current;
    if (!v || !clip) return;
    const applySeek = () => {
      v.currentTime = clip.sourceStart;
      if (bg) bg.currentTime = clip.sourceStart;
      if (isPlayingRef.current) {
        v.play().catch(() => {});
        if (bg) bg.play().catch(() => {});
      }
    };
    if (v.readyState >= 1) {
      applySeek();
    } else {
      v.addEventListener('loadedmetadata', applySeek, { once: true });
      return () => v.removeEventListener('loadedmetadata', applySeek);
    }
  }, [clip && clip.id, clip && clip.sourceStart]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !clip) return undefined;
    const onTime = () => {
      const offset = v.currentTime - clip.sourceStart;
      if (offset >= 0) onTimeUpdate?.(offset);
      if (!endedRef.current && v.currentTime >= clip.sourceEnd - 0.03) {
        endedRef.current = true;
        onClipEnded?.();
      }
    };
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, [clip, onTimeUpdate, onClipEnded]);

  useEffect(() => {
    const v = videoRef.current;
    const bg = bgVideoRef.current;
    if (!v) return;
    if (isPlaying && v.paused) {
      v.play().catch(() => {});
      if (bg) bg.play().catch(() => {});
    } else if (!isPlaying && !v.paused) {
      v.pause();
      if (bg) bg.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return undefined;
    const onWheel = (e) => {
      if (!clip || !onTransformChange) return;
      if (e.target.closest('[data-text-item]') || e.target.closest('[data-text-handle]')) return;
      e.preventDefault();
      const cur = clip.transform || { x: 0, y: 0, scale: 1 };
      const factor = Math.exp(-e.deltaY * 0.0015);
      const scale = clamp(cur.scale * factor, 0.1, 4);
      onTransformChange({ ...cur, scale });
    };
    card.addEventListener('wheel', onWheel, { passive: false });
    return () => card.removeEventListener('wheel', onWheel);
  }, [clip, onTransformChange]);

  useLayoutEffect(() => {
    if (!selectedTextId) {
      setHandles(null);
      return;
    }
    const el = textRefs.current[selectedTextId];
    const card = cardRef.current;
    if (!el || !card) {
      setHandles(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const next = {
      nw: { x: r.left - c.left, y: r.top - c.top },
      ne: { x: r.right - c.left, y: r.top - c.top },
      sw: { x: r.left - c.left, y: r.bottom - c.top },
      se: { x: r.right - c.left, y: r.bottom - c.top },
    };
    setHandles((prev) => {
      if (
        prev &&
        Math.abs(prev.nw.x - next.nw.x) < 0.5 && Math.abs(prev.nw.y - next.nw.y) < 0.5 &&
        Math.abs(prev.se.x - next.se.x) < 0.5 && Math.abs(prev.se.y - next.se.y) < 0.5
      ) {
        return prev;
      }
      return next;
    });
  });

  const startVideoDrag = (e) => {
    onSelectText?.(null);
    if (!clip || !onTransformChange) return;
    e.preventDefault();
    cardRef.current?.setPointerCapture(e.pointerId);
    const cur = clip.transform || { x: 0, y: 0, scale: 1 };
    dragRef.current = { kind: 'video', startX: e.clientX, startY: e.clientY, baseX: cur.x, baseY: cur.y, cur };
  };

  const startTextDrag = (e, textId) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectText?.(textId);
    const text = texts.find((x) => x.id === textId);
    if (!text) return;
    cardRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: 'text',
      textId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: text.x,
      baseY: text.y,
    };
  };

  const startResize = (e, corner) => {
    e.stopPropagation();
    e.preventDefault();
    const text = texts.find((x) => x.id === selectedTextId);
    const el = textRefs.current[selectedTextId];
    if (!text || !el) return;
    const r = el.getBoundingClientRect();
    const opposite = {
      nw: { x: r.right, y: r.bottom },
      ne: { x: r.left, y: r.bottom },
      sw: { x: r.right, y: r.top },
      se: { x: r.left, y: r.top },
    }[corner];
    cardRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = {
      kind: 'resize',
      textId: selectedTextId,
      opposite,
      startSize: text.size || 60,
      startDist: Math.max(1, Math.hypot(e.clientX - opposite.x, e.clientY - opposite.y)),
    };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === 'video') {
      const dx = (e.clientX - d.startX) / DISPLAY_SCALE;
      const dy = (e.clientY - d.startY) / DISPLAY_SCALE;
      onTransformChange?.({
        ...d.cur,
        x: clamp(d.baseX + dx, -4000, 4000),
        y: clamp(d.baseY + dy, -4000, 4000),
      });
    } else if (d.kind === 'text') {
      const dx = (e.clientX - d.startX) / DISPLAY_SCALE;
      const dy = (e.clientY - d.startY) / DISPLAY_SCALE;
      onUpdateText?.(d.textId, {
        x: clamp(d.baseX + dx, -2000, 3000),
        y: clamp(d.baseY + dy, -2000, 3000),
      });
    } else if (d.kind === 'resize') {
      const dist = Math.hypot(e.clientX - d.opposite.x, e.clientY - d.opposite.y);
      const scale = dist / d.startDist;
      onUpdateText?.(d.textId, { size: clamp(d.startSize * scale, 12, 200) });
    }
  };

  const endDrag = () => { dragRef.current = null; };

  const setScale = (scale) => {
    if (!onTransformChange) return;
    onTransformChange({ ...t, scale: clamp(scale, 0.1, 4) });
  };

  const resetTransform = () => {
    if (!onTransformChange) return;
    onTransformChange({ x: 0, y: 0, scale: 1 });
  };

  const blurPx = (Number(meta?.blur) || 0) * DISPLAY_SCALE;

  return (
    <div className="flex flex-col items-center">
      <div
        ref={cardRef}
        onPointerDown={startVideoDrag}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-800 select-none"
        style={{ aspectRatio: '9 / 16', height: `${CARD_H}px`, cursor: clip ? 'grab' : 'default', touchAction: 'none' }}
      >
        {fileUrl && meta?.blurEnabled !== false && (
          <video
            ref={bgVideoRef}
            src={fileUrl}
            muted
            autoPlay={isPlaying}
            playsInline
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ filter: `blur(${blurPx}px) brightness(0.6) saturate(0.7)` }}
          />
        )}
        {meta?.blurEnabled === false && (
          <div className="absolute inset-0 bg-black pointer-events-none" />
        )}

        {clip && fileUrl ? (
          <video
            ref={videoRef}
            src={fileUrl}
            playsInline
            autoPlay={isPlaying}
            onPlay={() => onPlayStateChange?.(true)}
            onPause={() => onPlayStateChange?.(false)}
            className="pointer-events-none"
            style={{
              position: 'absolute',
              width: `${EXPORT_W * t.scale * DISPLAY_SCALE}px`,
              maxWidth: 'none',
              left: '50%',
              top: `${MAIN_Y * DISPLAY_SCALE}px`,
              transform: `translateX(-50%) translate(${t.x * DISPLAY_SCALE}px, ${t.y * DISPLAY_SCALE}px)`,
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm pointer-events-none">
            No clip selected
          </div>
        )}

        {texts.map((tx) => {
          const isVisible = tx.startOffset == null || tx.endOffset == null
            || (currentOffset >= tx.startOffset && currentOffset <= tx.endOffset);
          const selected = tx.id === selectedTextId;
          if (!isVisible && !selected) return null;
          return (
            <div
              key={tx.id}
              data-text-item
              ref={(el) => { if (el) textRefs.current[tx.id] = el; else delete textRefs.current[tx.id]; }}
              onPointerDown={(e) => startTextDrag(e, tx.id)}
              onClick={(e) => { e.stopPropagation(); onSelectText?.(tx.id); }}
              style={{
                position: 'absolute',
                left: `${(tx.x || 0) * DISPLAY_SCALE}px`,
                top: `${(tx.y || 0) * DISPLAY_SCALE}px`,
                color: tx.color || '#ffffff',
                fontFamily: FONT_CSS[tx.font] || FONT_CSS.inter,
                fontSize: `${(tx.size || 60) * DISPLAY_SCALE}px`,
                fontWeight: 700,
                lineHeight: 1.2,
                textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                cursor: 'move',
                userSelect: 'none',
                whiteSpace: 'pre',
                outline: selected ? '1.5px dashed #818cf8' : 'none',
                outlineOffset: '4px',
                zIndex: selected ? 30 : 20,
                opacity: !isVisible && selected ? 0.3 : 1,
              }}
            >
              {tx.text}
            </div>
          );
        })}

        {handles && CORNERS.map((corner) => (
          <div
            key={corner}
            data-text-handle
            onPointerDown={(e) => startResize(e, corner)}
            style={{
              position: 'absolute',
              left: `${handles[corner].x - 5}px`,
              top: `${handles[corner].y - 5}px`,
              width: '10px',
              height: '10px',
              background: '#6366f1',
              border: '1.5px solid #fff',
              borderRadius: '2px',
              cursor: CORNER_CURSOR[corner],
              zIndex: 40,
              touchAction: 'none',
            }}
          />
        ))}

        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-medium pointer-events-none">
          9:16
        </div>
        {clip && (
          <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-200 bg-black/50 px-1 rounded pointer-events-none">
            {formatTime(clip.sourceStart)} - {formatTime(clip.sourceEnd)}
          </div>
        )}
      </div>

      {clip && (
        <div className="mt-2 w-full max-w-[292px] flex items-center gap-2">
          <span className="text-[10px] text-slate-500 shrink-0">Zoom</span>
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.05"
            value={t.scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="flex-1 accent-indigo-500 h-1"
          />
          <span className="text-[10px] font-mono text-slate-400 w-10 text-right">{Math.round(t.scale * 100)}%</span>
          <button
            onClick={resetTransform}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
            title="Reset position and zoom"
          >
            Reset
          </button>
        </div>
      )}
      {clip && (
        <p className="mt-1 text-[10px] text-slate-600">Drag video to move · scroll to zoom · drag texts to place</p>
      )}
    </div>
  );
});

export default VideoPreview;
