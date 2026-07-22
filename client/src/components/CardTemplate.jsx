import { useRef, useEffect } from 'react';
import { FONT_CSS } from './CardMetadata.jsx';

const EXPORT_H = 1920;
const EXPORT_W = 1080;
const MAIN_Y = 360;

export default function CardTemplate({
  videoUrl,
  texts,
  headerText,
  animeTitle,
  openingNumber,
  songName,
  artistName,
  font = 'inter',
  color = '#ffffff',
  blur = 30,
  blurEnabled = true,
  transform,
  height = 520,
  isActive = false,
  onClick,
  showPlaceholder = true,
}) {
  const videoRef = useRef(null);
  const bgRef = useRef(null);
  const cardW = height * (9 / 16);
  const ds = height / EXPORT_H;
  const t = transform || { x: 0, y: 0, scale: 1 };
  const fontFamily = FONT_CSS[font] || FONT_CSS.inter;
  const blurPx = (Number(blur) || 0) * ds;

  useEffect(() => {
    const v = videoRef.current;
    const bg = bgRef.current;
    if (!v) return;
    if (isActive) {
      v.play().catch(() => {});
      if (bg) bg.play().catch(() => {});
    } else {
      v.pause();
      if (bg) bg.pause();
    }
  }, [isActive]);

  const hasBottomText = animeTitle || openingNumber || songName || artistName;

  return (
    <div
      onClick={onClick}
      className="relative bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-800 shrink-0"
      style={{ height: `${height}px`, width: `${cardW}px`, cursor: onClick ? 'pointer' : 'default' }}
    >
      {videoUrl && blurEnabled !== false && (
        <video
          ref={bgRef}
          src={videoUrl}
          muted
          autoPlay={isActive}
          playsInline
          preload={isActive ? 'auto' : 'none'}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ filter: `blur(${blurPx}px) brightness(0.6) saturate(0.7)` }}
        />
      )}
      {(!videoUrl || blurEnabled === false) && (
        <div className="absolute inset-0 bg-black pointer-events-none" />
      )}

      {headerText && (
        <div
          className="absolute top-[7%] left-1/2 -translate-x-1/2 text-center px-3 pointer-events-none"
          style={{
            color,
            fontFamily,
            fontSize: `${30 * ds * 2}px`,
            fontWeight: 700,
            textShadow: '0 2px 8px rgba(0,0,0,0.7)',
            maxWidth: '92%',
            lineHeight: 1.2,
          }}
        >
          {headerText}
        </div>
      )}

      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          muted
          autoPlay={isActive}
          preload={isActive ? 'auto' : 'none'}
          className="pointer-events-none"
          style={{
            position: 'absolute',
            width: `${EXPORT_W * t.scale * ds}px`,
            maxWidth: 'none',
            left: '50%',
            top: `${MAIN_Y * ds}px`,
            transform: `translateX(-50%) translate(${t.x * ds}px, ${t.y * ds}px)`,
          }}
        />
      ) : showPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm pointer-events-none">
          No video
        </div>
      ) : null}

      {texts && texts.length > 0 && texts.map((tx) => {
        const align = tx.align || 'left';
        const isCenter = align === 'center';
        const style = {
          position: 'absolute',
          left: isCenter ? '50%' : `${(tx.x || 0) * ds}px`,
          top: `${(tx.y || 0) * ds}px`,
          transform: isCenter ? 'translateX(-50%)' : 'none',
          color: tx.color || '#ffffff',
          fontFamily: FONT_CSS[tx.font] || FONT_CSS.inter,
          fontSize: `${(tx.size || 60) * ds}px`,
          fontWeight: 700,
          lineHeight: 1.2,
          textShadow: '0 2px 8px rgba(0,0,0,0.7)',
          whiteSpace: 'pre',
          textAlign: align,
        };
        if (align === 'right') {
          style.right = `${(1080 - (tx.x || 0)) * ds}px`;
          style.left = 'auto';
        }
        return (
          <div key={tx.id} className="pointer-events-none" style={style}>
            {tx.text}
          </div>
        );
      })}

      {!texts && hasBottomText && (
        <div
          className="absolute bottom-[6%] left-1/2 -translate-x-1/2 text-center px-3 pointer-events-none"
          style={{
            color,
            fontFamily,
            textShadow: '0 2px 8px rgba(0,0,0,0.7)',
            maxWidth: '92%',
            lineHeight: 1.4,
          }}
        >
          {animeTitle && <div style={{ fontSize: `${20 * ds * 2}px`, fontWeight: 700, marginBottom: 2 }}>{animeTitle}</div>}
          {openingNumber && <div style={{ fontSize: `${14 * ds * 2}px`, opacity: 0.9 }}>{openingNumber}</div>}
          {songName && <div style={{ fontSize: `${14 * ds * 2}px`, opacity: 0.9 }}>{songName}</div>}
          {artistName && <div style={{ fontSize: `${14 * ds * 2}px`, opacity: 0.9 }}>{artistName}</div>}
        </div>
      )}

      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-medium pointer-events-none">
        9:16
      </div>
    </div>
  );
}
