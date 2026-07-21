import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const VideoPreview = forwardRef(function VideoPreview(
  { clip, fileUrl, isPlaying, onTimeUpdate, onClipEnded, onPlayStateChange },
  ref
) {
  const videoRef = useRef(null);
  const endedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  useImperativeHandle(ref, () => ({
    seekTo: (offsetWithinClip) => {
      const v = videoRef.current;
      if (!v || !clip) return;
      v.currentTime = clip.sourceStart + Math.max(0, offsetWithinClip);
    },
  }), [clip]);

  useEffect(() => {
    endedRef.current = false;
    const v = videoRef.current;
    if (!v || !clip) return;
    const applySeek = () => {
      v.currentTime = clip.sourceStart;
      if (isPlayingRef.current) v.play().catch(() => {});
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
    if (!v) return;
    if (isPlaying && v.paused) v.play().catch(() => {});
    else if (!isPlaying && !v.paused) v.pause();
  }, [isPlaying]);

  const clipDuration = clip ? clip.sourceEnd - clip.sourceStart : 0;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative bg-black rounded-2xl overflow-hidden shadow-2xl ring-1 ring-slate-800"
        style={{ aspectRatio: '9 / 16', height: '520px' }}
      >
        {clip && fileUrl ? (
          <video
            ref={videoRef}
            src={fileUrl}
            className="w-full h-full object-cover"
            playsInline
            onPlay={() => onPlayStateChange?.(true)}
            onPause={() => onPlayStateChange?.(false)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">
            No clip selected
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-xs font-medium">
          9:16 preview
        </div>
        {clip && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs">
            <span className="px-2 py-0.5 rounded bg-black/60 font-mono">
              {formatTime(clip.sourceStart)} - {formatTime(clip.sourceEnd)}
            </span>
            <span className="px-2 py-0.5 rounded bg-black/60 font-mono">
              {formatTime(clipDuration)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

export default VideoPreview;
