import { FONT_CSS } from '../CardMetadata.jsx';
import CollaborativeRatingOverlay from '../CollaborativeRatingOverlay.jsx';
import { getAnimation, getKaraokeHighlight } from '../../lib/textAnimations.js';
import { getPipRect, getTextAlignTransform } from '../../lib/pipLayout.js';
import { BG_BRIGHTNESS, BG_SATURATION } from '../../lib/projectDefaults.js';

const OUTPUT_HEIGHT = 1920;
const OUTPUT_WIDTH = 1080;
const MAIN_VIDEO_Y = 360;

function hexToRgba(hex, alpha) {
  const value = hex || '#000000';
  const red = parseInt(value.slice(1, 3), 16);
  const green = parseInt(value.slice(3, 5), 16);
  const blue = parseInt(value.slice(5, 7), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

export default function ClipMedia({
  clip, fileUrl, videoRef, bgRef, pipRef, meta, displayScale, files,
  currentOffset, interactive, selectedTextId, onSelectText, startTextDrag, textRefs,
  onPlay, onPause,
}) {
  if (!clip) return null;
  const transform = clip.transform || { x: 0, y: 0, scale: 1 };
  const texts = clip.texts || [];
  const introActive = clip.videoLayout === 'cover'
    || (Number.isFinite(clip.introEnd) && clip.sourceStart + currentOffset < clip.introEnd);
  const blurPx = (Number(meta?.blur) || 0) * displayScale;
  const previewBrightness = 1 + BG_BRIGHTNESS;

  return (
    <>
      {fileUrl && meta?.blurEnabled !== false && (
        <video
          ref={bgRef}
          src={fileUrl}
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: `blur(${blurPx}px) brightness(${previewBrightness}) saturate(${BG_SATURATION})` }}
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
            width: `${OUTPUT_WIDTH * Math.max(0.1, Math.min(10, transform.scale || 1)) * displayScale}px`,
            maxWidth: 'none',
            left: '50%',
            top: `${MAIN_VIDEO_Y * displayScale}px`,
            transform: `translateX(-50%) translate(${transform.x * displayScale}px, ${transform.y * displayScale}px)`,
          }}
        />
      ) : null}
      {clip.pip?.enabled && clip.pip.fileId && (() => {
        const pipFile = files?.find((file) => file.id === clip.pip.fileId);
        if (!pipFile?.url) return null;
        const rect = getPipRect(clip.pip, OUTPUT_WIDTH, OUTPUT_HEIGHT);
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
      {meta?.collaborativeRanking?.enabled && (
        <CollaborativeRatingOverlay
          participants={meta.collaborativeRanking.participants || []}
          rating={clip.collaborativeRating}
          scale={displayScale}
        />
      )}
      {texts.map((text) => {
        const isVisible = text.startOffset == null || text.endOffset == null
          || (currentOffset >= text.startOffset && currentOffset <= text.endOffset);
        const selected = interactive && text.id === selectedTextId;
        if (!isVisible && !selected) return null;

        let animationStyle = {};
        let displayText = text.text;
        let karaokeHighlight = '';

        if (text.animation?.type && isVisible) {
          const animation = getAnimation(text.animation.type);
          const elapsed = currentOffset - (text.startOffset || 0);
          const duration = Math.max(0.1, text.animation.duration || 0.5);
          const progress = Math.min(1, elapsed / duration);

          if (animation.isTypewriter) {
            displayText = (text.text || '').slice(0, Math.floor(progress * (text.text || '').length));
          } else if (animation.isKaraoke) {
            karaokeHighlight = getKaraokeHighlight(text.text || '', progress);
          } else if (animation.getPreviewStyle) {
            animationStyle = animation.getPreviewStyle(progress, text.x, text.y, text.text) || {};
          }
        }

        const alignTransform = getTextAlignTransform(text.align || 'left');
        const transforms = [
          alignTransform !== 'none' ? alignTransform : null,
          animationStyle.transform || null,
          text.rotation ? `rotate(${text.rotation}deg)` : null,
        ].filter(Boolean);
        const { transform: _transform, _karaokeHighlight, _visibleText, ...animationProperties } = animationStyle;
        const textStyle = {
          position: 'absolute',
          left: `${(text.x || 0) * displayScale}px`,
          top: `${(text.y || 0) * displayScale}px`,
          color: text.color || '#ffffff',
          fontFamily: FONT_CSS[text.font] || FONT_CSS.inter,
          fontSize: `${Math.max(12, Math.min(400, text.size || 60)) * displayScale}px`,
          fontWeight: 700,
          lineHeight: 1.2,
          cursor: interactive ? 'move' : 'default',
          userSelect: 'none',
          whiteSpace: 'pre',
          outline: selected ? '1.5px dashed #a855f7' : 'none',
          outlineOffset: '4px',
          zIndex: selected ? 30 : 20,
          opacity: !isVisible && selected ? 0.3 : 1,
          transformOrigin: text.align === 'center' ? 'center top' : (text.align === 'right' ? 'right top' : 'left top'),
          transform: transforms.length ? transforms.join(' ') : undefined,
          pointerEvents: interactive ? 'auto' : 'none',
          ...animationProperties,
        };
        if (text.strokeEnabled && text.strokeWidth > 0) {
          textStyle.WebkitTextStroke = `${(text.strokeWidth || 2) * displayScale}px ${text.strokeColor || '#000000'}`;
        } else {
          textStyle.textShadow = '0 2px 8px rgba(0,0,0,0.7)';
        }
        if (text.bgEnabled) {
          textStyle.backgroundColor = hexToRgba(text.bgColor || '#000000', text.bgOpacity ?? 0.7);
          textStyle.padding = `${(text.bgPadding || 12) * displayScale}px`;
          textStyle.borderRadius = `${(text.bgRadius || 8) * displayScale}px`;
        }

        return (
          <div
            key={text.id}
            data-text-item={interactive ? true : undefined}
            ref={interactive ? (element) => {
              if (element) textRefs.current[text.id] = element;
              else delete textRefs.current[text.id];
            } : undefined}
            onPointerDown={interactive ? (event) => startTextDrag(event, text.id) : undefined}
            onClick={interactive ? (event) => {
              event.stopPropagation();
              onSelectText?.(text.id);
            } : undefined}
            style={textStyle}
          >
            {karaokeHighlight ? (
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ opacity: 0.35 }}>{displayText}</span>
                <span style={{ position: 'absolute', left: 0, top: 0, color: text.color || '#ffffff' }}>
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
