export const PX_PER_SEC = 26;
export const MIN_CLIP_WIDTH = 12;
export const TRANSITION_PICKER_WIDTH = 44;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 10;
export const ZOOM_STEP = 0.1;
export const WHEEL_ZOOM_STEP = 0.2;

export function clampZoom(zoom) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(zoom) || 1));
}

export function getEffectivePxPerSec(zoom) {
  return PX_PER_SEC * clampZoom(zoom);
}

export function getTimelineWidth(totalDuration, zoom) {
  return Math.max(0, totalDuration) * getEffectivePxPerSec(zoom);
}

export function getTrackWidth(clips, zoom) {
  const pxPerSec = getEffectivePxPerSec(zoom);
  const clipsWidth = (clips || []).reduce((sum, clip) => {
    const dur = Math.max(0, clip.sourceEnd - clip.sourceStart);
    return sum + Math.max(MIN_CLIP_WIDTH, dur * pxPerSec);
  }, 0);
  const transitionsWidth = Math.max(0, (clips || []).length - 1) * TRANSITION_PICKER_WIDTH;
  return clipsWidth + transitionsWidth;
}

export function getPlayheadLeft(clips, transitions, currentGlobalTime, zoom) {
  const pxPerSec = getEffectivePxPerSec(zoom);
  let cumWidth = 0;
  let cumTime = 0;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const dur = Math.max(0, clip.sourceEnd - clip.sourceStart);
    const visualWidth = Math.max(MIN_CLIP_WIDTH, dur * pxPerSec);

    if (currentGlobalTime >= cumTime && currentGlobalTime <= cumTime + dur) {
      const progress = dur > 0 ? (currentGlobalTime - cumTime) / dur : 0;
      return cumWidth + progress * visualWidth;
    }

    cumWidth += visualWidth;
    cumTime += dur;

    if (i < clips.length - 1) {
      const t = transitions[i];
      const transDur = t && t.type !== 'none' ? Number(t.durationSec) || 0 : 0;
      if (currentGlobalTime >= cumTime - transDur && currentGlobalTime < cumTime) {
        return cumWidth + TRANSITION_PICKER_WIDTH / 2;
      }
      cumWidth += TRANSITION_PICKER_WIDTH;
    }
  }

  return cumWidth;
}
