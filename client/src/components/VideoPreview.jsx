import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { FONT_CSS } from './CardMetadata.jsx';
import { getPreviewAnimationStyle, getAnimation } from '../lib/textAnimations.js';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const EXPORT_H = 1920;
const EXPORT_W = 1080;
const MAIN_Y = 360;
const OUTPUT_FPS = 30;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const CORNERS = ['nw', 'ne', 'sw', 'se'];
const CORNER_CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };

const VideoPreview = forwardRef(function VideoPreview(
  {
    clip, fileUrl, isPlaying, onTimeUpdate, onClipEnded, onPlayStateChange,
    meta, onTransformChange, selectedTextId, onSelectText, onUpdateText,
    currentOffset, files,
  },
  ref
) {
  const videoRef = useRef(null);
  const bgVideoRef = useRef(null);
  const cardRef = useRef(null);
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const textRefs = useRef({});
  const endedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const [handles, setHandles] = useState(null);
  const [cardH, setCardH] = useState(480);

  const DISPLAY_SCALE = cardH / EXPORT_H;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height, width } = entry.contentRect;
        const maxH = Math.min(height, width * 16 / 9);
        setCardH(Math.max(200, Math.floor(maxH)));
      }
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

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
    stepFrame: (direction) => {
      const v = videoRef.current;
      const bg = bgVideoRef.current;
      if (!v || !clip) return;
      const frameDuration = 1 / OUTPUT_FPS;
      const newTime = Math.max(clip.sourceStart, Math.min(clip.sourceEnd - 0.01, v.currentTime + direction * frameDuration));
      v.currentTime = newTime;
      if (bg) bg.currentTime = newTime;
      const offset = newTime - clip.sourceStart;
      if (offset >= 0) onTimeUpdate?.(offset);
    },
  }), [clip, onTimeUpdate]);

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
    if (!v || !clip) return;
    const rate = clip.speed || 1;
    const safeRate = Math.max(0.0625, Math.min(16, rate));
    if (v.playbackRate !== safeRate) {
      v.playbackRate = safeRate;
    }
  }, [clip?.speed]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !clip) return;
    const audio = clip.audio || { volume: 1, mute: false };
    v.muted = audio.mute || false;
    const volume = Math.max(0, Math.min(1, audio.volume || 1));
    v.volume = audio.mute ? 0 : volume;
  }, [clip?.audio?.volume, clip?.audio?.mute]);

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
    <div ref={containerRef} className="flex items-center justify-center w-full h-full p-4">
      <div
        ref={cardRef}
        onPointerDown={startVideoDrag}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative bg-black rounded-lg overflow-hidden shadow-2xl ring-1 ring-editor-border select-none"
        style={{ aspectRatio: '9 / 16', height: `${cardH}px`, cursor: clip ? 'grab' : 'default', touchAction: 'none' }}
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
              width: `${EXPORT_W * Math.max(0.1, Math.min(10, t.scale || 1)) * DISPLAY_SCALE}px`,
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

        {clip?.pip?.enabled && clip.pip.fileId && (() => {
          const pipFile = files?.find((f) => f.id === clip.pip.fileId);
          if (!pipFile?.url) return null;
          
          const sizePercent = clip.pip.size || 30;
          const pipWidth = EXPORT_W * (sizePercent / 100) * DISPLAY_SCALE;
          const pipHeight = pipWidth * 9 / 16;
          
          let x = 20 * DISPLAY_SCALE;
          let y = 20 * DISPLAY_SCALE;
          
          switch (clip.pip.position) {
            case 'top-right':
              x = (EXPORT_W - pipWidth / DISPLAY_SCALE - 20) * DISPLAY_SCALE;
              y = 20 * DISPLAY_SCALE;
              break;
            case 'bottom-left':
              x = 20 * DISPLAY_SCALE;
              y = (EXPORT_H - pipHeight / DISPLAY_SCALE - 20) * DISPLAY_SCALE;
              break;
            case 'bottom-right':
              x = (EXPORT_W - pipWidth / DISPLAY_SCALE - 20) * DISPLAY_SCALE;
              y = (EXPORT_H - pipHeight / DISPLAY_SCALE - 20) * DISPLAY_SCALE;
              break;
          }
          
          return (
            <video
              src={pipFile.url}
              playsInline
              autoPlay={isPlaying}
              muted
              className="pointer-events-none"
              style={{
                position: 'absolute',
                width: `${pipWidth}px`,
                height: `${pipHeight}px`,
                left: `${x}px`,
                top: `${y}px`,
                opacity: Math.max(0, Math.min(1, clip.pip.opacity ?? 1)),
                border: clip.pip.border ? `${(clip.pip.borderWidth || 4) * DISPLAY_SCALE}px solid white` : 'none',
                borderRadius: `${(clip.pip.borderRadius || 8) * DISPLAY_SCALE}px`,
                objectFit: 'cover',
              }}
            />
          );
        })()}

        {texts.map((tx) => {
          const isVisible = tx.startOffset == null || tx.endOffset == null
            || (currentOffset >= tx.startOffset && currentOffset <= tx.endOffset);
          const selected = tx.id === selectedTextId;
          if (!isVisible && !selected) return null;

          let animStyle = {};
          let displayText = tx.text;

          if (tx.animation?.type && isVisible) {
            const animDef = getAnimation(tx.animation.type);
            const elapsed = currentOffset - tx.startOffset;
            const animDur = Math.max(0.1, tx.animation.duration || 0.5);
            const progress = Math.min(1, elapsed / animDur);

            if (animDef.isTypewriter) {
              const len = (tx.text || '').length;
              const visibleChars = Math.floor(progress * len);
              displayText = (tx.text || '').slice(0, visibleChars);
            } else if (animDef.isKaraoke) {
              animStyle = { opacity: 1 };
            } else if (animDef.getPreviewStyle) {
              animStyle = animDef.getPreviewStyle(progress, tx.x, tx.y, tx.text) || {};
            }
          }

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
                fontSize: `${Math.max(12, Math.min(400, tx.size || 60)) * DISPLAY_SCALE}px`,
                fontWeight: 700,
                lineHeight: 1.2,
                textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                cursor: 'move',
                userSelect: 'none',
                whiteSpace: 'pre',
                outline: selected ? '1.5px dashed #a855f7' : 'none',
                outlineOffset: '4px',
                zIndex: selected ? 30 : 20,
                opacity: !isVisible && selected ? 0.3 : 1,
                ...animStyle,
              }}
            >
              {displayText}
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
                background: '#a855f7',
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
    </div>
  );
});

export default VideoPreview;
