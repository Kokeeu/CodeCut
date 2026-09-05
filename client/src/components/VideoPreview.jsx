import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { FONT_CSS } from './CardMetadata.jsx';
import { getAnimation, getKaraokeHighlight } from '../lib/textAnimations.js';
import useThrottledCallback from '../hooks/useThrottledCallback.js';
import { getPipRect, getTextAlignTransform } from '../lib/pipLayout.js';
import { BG_BRIGHTNESS, BG_SATURATION } from '../lib/projectDefaults.js';
import { getPreviewTransitionStyles } from '../lib/transitions.js';

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

function hexToRgba(hex, alpha) {
  const h = hex || '#000000';
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function ClipMedia({
  clip, fileUrl, videoRef, bgRef, pipRef, meta, displayScale, files,
  currentOffset, interactive, selectedTextId, onSelectText, startTextDrag, textRefs,
  onPlay, onPause,
}) {
  if (!clip) return null;
  const t = clip.transform || { x: 0, y: 0, scale: 1 };
  const texts = clip.texts || [];
  const introActive = clip.videoLayout === 'cover'
    || (Number.isFinite(clip.introEnd) && clip.sourceStart + currentOffset < clip.introEnd);
  const blurPx = (Number(meta?.blur) || 0) * displayScale;
  const previewBrightness = 1 + BG_BRIGHTNESS;
  const previewSaturate = BG_SATURATION;

  return (
    <>
      {fileUrl && meta?.blurEnabled !== false && (
        <video
          ref={bgRef}
          src={fileUrl}
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: `blur(${blurPx}px) brightness(${previewBrightness}) saturate(${previewSaturate})` }}
        />
      )}
      {meta?.blurEnabled === false && (
        <div className="absolute inset-0 bg-black pointer-events-none" />
      )}
      {fileUrl ? (
        <video
          ref={videoRef}
          src={fileUrl}
          playsInline
          onPlay={onPlay}
          onPause={onPause}
          className="pointer-events-none"
          style={introActive ? {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          } : {
            position: 'absolute',
            width: `${EXPORT_W * Math.max(0.1, Math.min(10, t.scale || 1)) * displayScale}px`,
            maxWidth: 'none',
            left: '50%',
            top: `${MAIN_Y * displayScale}px`,
            transform: `translateX(-50%) translate(${t.x * displayScale}px, ${t.y * displayScale}px)`,
          }}
        />
      ) : null}
      {clip.pip?.enabled && clip.pip.fileId && (() => {
        const pipFile = files?.find((f) => f.id === clip.pip.fileId);
        if (!pipFile?.url) return null;
        const rect = getPipRect(clip.pip, EXPORT_W, EXPORT_H);
        return (
          <video
            ref={pipRef}
            src={pipFile.url}
            playsInline
            muted
            className="pointer-events-none"
            style={{
              position: 'absolute',
              width: `${rect.width * displayScale}px`,
              height: `${rect.height * displayScale}px`,
              left: `${rect.x * displayScale}px`,
              top: `${rect.y * displayScale}px`,
              opacity: Math.max(0, Math.min(1, clip.pip.opacity ?? 1)),
              border: clip.pip.border ? `${(clip.pip.borderWidth || 4) * displayScale}px solid white` : 'none',
              borderRadius: `${(clip.pip.borderRadius || 8) * displayScale}px`,
              objectFit: 'cover',
              boxSizing: 'content-box',
            }}
          />
        );
      })()}
      {texts.map((tx) => {
        const isVisible = tx.startOffset == null || tx.endOffset == null
          || (currentOffset >= tx.startOffset && currentOffset <= tx.endOffset);
        const selected = interactive && tx.id === selectedTextId;
        if (!isVisible && !selected) return null;

        let animStyle = {};
        let displayText = tx.text;
        let karaokeHighlight = '';

        if (tx.animation?.type && isVisible) {
          const animDef = getAnimation(tx.animation.type);
          const elapsed = currentOffset - (tx.startOffset || 0);
          const animDur = Math.max(0.1, tx.animation.duration || 0.5);
          const progress = Math.min(1, elapsed / animDur);

          if (animDef.isTypewriter) {
            const len = (tx.text || '').length;
            displayText = (tx.text || '').slice(0, Math.floor(progress * len));
          } else if (animDef.isKaraoke) {
            karaokeHighlight = getKaraokeHighlight(tx.text || '', progress);
          } else if (animDef.getPreviewStyle) {
            animStyle = animDef.getPreviewStyle(progress, tx.x, tx.y, tx.text) || {};
          }
        }

        const alignTx = getTextAlignTransform(tx.align || 'left');
        const transforms = [
          alignTx !== 'none' ? alignTx : null,
          animStyle.transform || null,
          tx.rotation ? `rotate(${tx.rotation}deg)` : null,
        ].filter(Boolean);
        const { transform: _animTransform, _karaokeHighlight, _visibleText, ...restAnim } = animStyle;
        const textStyle = {
          position: 'absolute',
          left: `${(tx.x || 0) * displayScale}px`,
          top: `${(tx.y || 0) * displayScale}px`,
          color: tx.color || '#ffffff',
          fontFamily: FONT_CSS[tx.font] || FONT_CSS.inter,
          fontSize: `${Math.max(12, Math.min(400, tx.size || 60)) * displayScale}px`,
          fontWeight: 700,
          lineHeight: 1.2,
          cursor: interactive ? 'move' : 'default',
          userSelect: 'none',
          whiteSpace: 'pre',
          outline: selected ? '1.5px dashed #a855f7' : 'none',
          outlineOffset: '4px',
          zIndex: selected ? 30 : 20,
          opacity: !isVisible && selected ? 0.3 : 1,
          transformOrigin: tx.align === 'center' ? 'center top' : (tx.align === 'right' ? 'right top' : 'left top'),
          transform: transforms.length ? transforms.join(' ') : undefined,
          pointerEvents: interactive ? 'auto' : 'none',
          ...restAnim,
        };
        if (tx.strokeEnabled && tx.strokeWidth > 0) {
          textStyle.WebkitTextStroke = `${(tx.strokeWidth || 2) * displayScale}px ${tx.strokeColor || '#000000'}`;
        } else {
          textStyle.textShadow = '0 2px 8px rgba(0,0,0,0.7)';
        }
        if (tx.bgEnabled) {
          textStyle.backgroundColor = hexToRgba(tx.bgColor || '#000000', tx.bgOpacity ?? 0.7);
          textStyle.padding = `${(tx.bgPadding || 12) * displayScale}px`;
          textStyle.borderRadius = `${(tx.bgRadius || 8) * displayScale}px`;
        }
        return (
          <div
            key={tx.id}
            data-text-item={interactive ? true : undefined}
            ref={interactive ? (el) => { if (el) textRefs.current[tx.id] = el; else delete textRefs.current[tx.id]; } : undefined}
            onPointerDown={interactive ? (e) => startTextDrag(e, tx.id) : undefined}
            onClick={interactive ? (e) => { e.stopPropagation(); onSelectText?.(tx.id); } : undefined}
            style={textStyle}
          >
            {karaokeHighlight ? (
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ opacity: 0.35 }}>{displayText}</span>
                <span style={{ position: 'absolute', left: 0, top: 0, color: tx.color || '#ffffff' }}>
                  {karaokeHighlight}
                </span>
              </span>
            ) : displayText}
          </div>
        );
      })}
    </>
  );
}

const VideoPreview = forwardRef(function VideoPreview(
  {
    clip, fileUrl, isPlaying, onTimeUpdate, onClipEnded, onPlayStateChange,
    meta, onTransformChange, selectedTextId, onSelectText, onUpdateText,
    currentOffset, files, showGuides, incoming,
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
  const isEndingRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const rewindRef = useRef(null);
  const seekTargetRef = useRef(null);
  const pipVideoRef = useRef(null);
  const inVideoRef = useRef(null);
  const inBgRef = useRef(null);
  const inPipRef = useRef(null);
  const offsetRef = useRef(currentOffset);
  const clipIdRef = useRef(clip?.id);
  offsetRef.current = currentOffset;
  isPlayingRef.current = isPlaying;
  clipIdRef.current = clip?.id;

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

  const throttledTimeUpdate = useThrottledCallback((offset, clipId) => {
    if (clipId !== clipIdRef.current) return;
    onTimeUpdate?.(offset);
  }, 33);

  useEffect(() => {
    throttledTimeUpdate.cancel?.();
  }, [clip?.id, throttledTimeUpdate]);

  useImperativeHandle(ref, () => ({
    seekTo: (offsetWithinClip) => {
      const v = videoRef.current;
      const bg = bgVideoRef.current;
      const tt = clip ? clip.sourceStart + Math.max(0, offsetWithinClip) : 0;
      seekTargetRef.current = tt;
      if (v) v.currentTime = tt;
      if (bg) bg.currentTime = tt;
      if (pipVideoRef.current) pipVideoRef.current.currentTime = Math.max(0, offsetWithinClip);
    },
    stepFrame: (direction) => {
      const v = videoRef.current;
      const bg = bgVideoRef.current;
      if (!v || !clip) return;
      const frameDuration = 1 / OUTPUT_FPS;
      const newTime = Math.max(clip.sourceStart, Math.min(clip.sourceEnd - 0.01, v.currentTime + direction * frameDuration));
      seekTargetRef.current = newTime;
      v.currentTime = newTime;
      if (bg) bg.currentTime = newTime;
      if (pipVideoRef.current) pipVideoRef.current.currentTime = Math.max(0, newTime - clip.sourceStart);
    },
    startRewind: (speedMultiplier = 1) => {
      if (rewindRef.current) clearInterval(rewindRef.current);
      const v = videoRef.current;
      const bg = bgVideoRef.current;
      if (!v || !clip) return;
      v.pause();
      if (bg) bg.pause();
      const frameDuration = 1 / OUTPUT_FPS;
      const step = frameDuration * 4 * speedMultiplier;
      rewindRef.current = setInterval(() => {
        if (!v) return;
        const newTime = Math.max(clip.sourceStart, v.currentTime - step);
        v.currentTime = newTime;
        if (bg) bg.currentTime = newTime;
        if (newTime <= clip.sourceStart + 0.01) {
          clearInterval(rewindRef.current);
          rewindRef.current = null;
        }
      }, 1000 / OUTPUT_FPS);
    },
    stopRewind: () => {
      if (rewindRef.current) {
        clearInterval(rewindRef.current);
        rewindRef.current = null;
      }
    },
    setPlaybackSpeed: (rate) => {
      const v = videoRef.current;
      if (!v) return;
      const safeRate = Math.max(0.0625, Math.min(16, rate));
      v.playbackRate = safeRate;
    },
  }), [clip]);

  useEffect(() => {
    endedRef.current = false;
    isEndingRef.current = false;
    const v = videoRef.current;
    const bg = bgVideoRef.current;
    if (!v || !clip) return;
    if (rewindRef.current) {
      clearInterval(rewindRef.current);
      rewindRef.current = null;
    }
    const playIfNeeded = () => {
      if (!isPlayingRef.current) return;
      v.play().catch(() => {
        if (isPlayingRef.current) v.play().catch(() => {});
      });
      if (bg) bg.play().catch(() => {});
      pipVideoRef.current?.play?.().catch(() => {});
    };
    const applySeek = () => {
      const tt = clip.sourceStart + Math.max(0, offsetRef.current || 0);
      seekTargetRef.current = tt;
      v.currentTime = tt;
      if (bg) bg.currentTime = tt;
      if (pipVideoRef.current) pipVideoRef.current.currentTime = Math.max(0, offsetRef.current || 0);
      playIfNeeded();
    };
    if (v.readyState >= 1) {
      applySeek();
    } else {
      v.addEventListener('loadedmetadata', applySeek, { once: true });
      return () => v.removeEventListener('loadedmetadata', applySeek);
    }
  }, [clip?.id, clip?.sourceStart]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !clip) return;
    const rate = clip.speed || 1;
    const safeRate = Math.max(0.0625, Math.min(16, rate));
    if (v.playbackRate !== safeRate) {
      v.playbackRate = safeRate;
    }
  }, [clip?.speed]);

  const transStyles = incoming
    ? getPreviewTransitionStyles(incoming.type, incoming.progress)
    : null;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !clip) return;
    const audio = clip.audio || { volume: 1, mute: false };
    const gain = transStyles ? transStyles.audioOut : 1;
    v.muted = audio.mute || false;
    const volume = Math.max(0, Math.min(1, (audio.volume || 1) * gain));
    v.volume = audio.mute ? 0 : volume;
  }, [clip?.audio?.volume, clip?.audio?.mute, transStyles, clip]);

  useEffect(() => {
    if (!clip || !files || files.length === 0) return;
    
    const currentClipIndex = files.findIndex((f) => f.id === clip.fileId);
    if (currentClipIndex < 0 || currentClipIndex >= files.length - 1) return;
    
    const nextClip = files[currentClipIndex + 1];
    if (!nextClip?.url) return;
    
    const preloadVideo = document.createElement('video');
    preloadVideo.preload = 'metadata';
    preloadVideo.src = nextClip.url;
    
    return () => {
      preloadVideo.src = '';
    };
  }, [clip, files]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !clip) return undefined;
    const finishClip = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      isEndingRef.current = true;
      throttledTimeUpdate.cancel?.();
      try { v.pause(); } catch (_) { /* ignore */ }
      onClipEnded?.();
    };
    const onTime = () => {
      if (seekTargetRef.current !== null) {
        const diff = Math.abs(v.currentTime - seekTargetRef.current);
        if (diff > 0.05) return;
        seekTargetRef.current = null;
      }
      const offset = v.currentTime - clip.sourceStart;
      if (offset >= 0) throttledTimeUpdate(offset, clip.id);
      if (v.currentTime >= clip.sourceEnd - (1 / OUTPUT_FPS)) finishClip();
    };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', finishClip);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', finishClip);
    };
  }, [clip, throttledTimeUpdate, onClipEnded]);

  useEffect(() => {
    const v = videoRef.current;
    const bg = bgVideoRef.current;
    if (!v || !clip) return;
    if (isPlaying && v.paused) {
      const seeking = seekTargetRef.current !== null
        && Math.abs(v.currentTime - seekTargetRef.current) > 0.05;
      if (seeking) {
        v.play().catch(() => {});
        if (bg) bg.play().catch(() => {});
        pipVideoRef.current?.play?.().catch(() => {});
      } else if (v.currentTime >= clip.sourceEnd - (1 / OUTPUT_FPS)) {
        if (!endedRef.current) {
          endedRef.current = true;
          isEndingRef.current = true;
          onClipEnded?.();
        }
      } else {
        v.play().catch(() => {});
        if (bg) bg.play().catch(() => {});
        pipVideoRef.current?.play?.().catch(() => {});
      }
    } else if (!isPlaying && !v.paused) {
      v.pause();
      if (bg) bg.pause();
      pipVideoRef.current?.pause?.();
    }
    const iv = inVideoRef.current;
    const ib = inBgRef.current;
    if (incoming && iv) {
      if (isPlaying) {
        iv.play().catch(() => {});
        ib?.play?.().catch(() => {});
        inPipRef.current?.play?.().catch(() => {});
      } else {
        iv.pause();
        ib?.pause?.();
        inPipRef.current?.pause?.();
      }
    }
  }, [isPlaying, clip?.id, incoming?.clip?.id, clip?.sourceEnd, onClipEnded]);

  useEffect(() => {
    const iv = inVideoRef.current;
    const ib = inBgRef.current;
    if (!incoming?.clip || !iv) return;
    const inClip = incoming.clip;
    const tt = inClip.sourceStart + Math.max(0, incoming.sourceOffset || 0);
    if (Math.abs(iv.currentTime - tt) > 0.12) {
      iv.currentTime = tt;
      if (ib) ib.currentTime = tt;
      if (inPipRef.current) inPipRef.current.currentTime = Math.max(0, incoming.sourceOffset || 0);
    }
    const rate = Math.max(0.0625, Math.min(16, inClip.speed || 1));
    iv.playbackRate = rate;
    if (ib) ib.playbackRate = rate;
    if (inPipRef.current) inPipRef.current.playbackRate = rate;
    const audio = inClip.audio || { volume: 1, mute: false };
    const gain = transStyles ? transStyles.audioIn : 1;
    iv.muted = audio.mute || false;
    iv.volume = audio.mute ? 0 : Math.max(0, Math.min(1, (audio.volume || 1) * gain));
    if (isPlayingRef.current && iv.paused) iv.play().catch(() => {});
  }, [incoming, transStyles]);

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
  }, [selectedTextId, currentOffset, texts.length]);

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

  return (
    <div ref={containerRef} className="flex items-center justify-center w-full h-full p-4">
      <div
        ref={cardRef}
        onPointerDown={startVideoDrag}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative bg-black rounded-2xl overflow-hidden shadow-panel-lg ring-1 ring-white/[0.06] select-none"
        style={{
          aspectRatio: '9 / 16',
          height: `${cardH}px`,
          cursor: clip ? 'grab' : 'default',
          touchAction: 'none',
          boxShadow: '0 32px 80px -16px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.04), 0 0 60px -20px rgba(168, 85, 247, 0.15)',
        }}
      >
        {clip && fileUrl ? (
          (() => {
            const outgoingLayer = (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ zIndex: transStyles && !transStyles.incomingOnTop ? 3 : 1, ...((transStyles && transStyles.outgoing) || {}) }}
              >
                <ClipMedia
                  clip={clip}
                  fileUrl={fileUrl}
                  videoRef={videoRef}
                  bgRef={bgVideoRef}
                  pipRef={pipVideoRef}
                  meta={meta}
                  displayScale={DISPLAY_SCALE}
                  files={files}
                  currentOffset={currentOffset}
                  interactive
                  selectedTextId={selectedTextId}
                  onSelectText={onSelectText}
                  startTextDrag={startTextDrag}
                  textRefs={textRefs}
                  onPlay={() => onPlayStateChange?.(true)}
                  onPause={() => {
                    if (isEndingRef.current || isPlayingRef.current || seekTargetRef.current !== null) {
                      return;
                    }
                    onPlayStateChange?.(false);
                  }}
                />
              </div>
            );
            const incomingLayer = incoming?.clip && incoming.fileUrl ? (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ zIndex: transStyles && transStyles.incomingOnTop ? 3 : 1, ...((transStyles && transStyles.incoming) || {}) }}
              >
                <ClipMedia
                  clip={incoming.clip}
                  fileUrl={incoming.fileUrl}
                  videoRef={inVideoRef}
                  bgRef={inBgRef}
                  pipRef={inPipRef}
                  meta={meta}
                  displayScale={DISPLAY_SCALE}
                  files={files}
                  currentOffset={incoming.sourceOffset}
                  interactive={false}
                />
              </div>
            ) : null;
            const first = transStyles && !transStyles.incomingOnTop ? incomingLayer : outgoingLayer;
            const second = transStyles && !transStyles.incomingOnTop ? outgoingLayer : incomingLayer;
            return (
              <>
                {first}
                {second}
                {transStyles?.veil && (
                  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 4, ...transStyles.veil }} />
                )}
              </>
            );
          })()
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm pointer-events-none">
            No clip selected
          </div>
        )}

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

        {showGuides && (
          <>
            <div style={{
              position: 'absolute',
              left: '2.5%', top: '2.5%',
              width: '95%', height: '95%',
              border: '1px solid rgba(255,255,255,0.15)',
              pointerEvents: 'none',
              zIndex: 50,
            }} />
            <div style={{
              position: 'absolute',
              left: '5%', top: '5%',
              width: '90%', height: '90%',
              border: '1px dashed rgba(255,255,255,0.3)',
              pointerEvents: 'none',
              zIndex: 50,
            }} />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
              <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.12)' }} />
            </div>
          </>
        )}

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
