import { getTotalDuration } from './transitions.js';

export const PX_PER_SEC = 26;
export const MIN_CLIP_WIDTH = 4;
export const TRANSITION_PICKER_WIDTH = 32;
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

export function getTrackWidth(clips, transitions, zoom) {
  return getTotalDuration(clips || [], transitions || []) * getEffectivePxPerSec(zoom);
}

export function getPlayheadLeft(clips, transitions, currentGlobalTime, zoom) {
  return Math.max(0, Number(currentGlobalTime) || 0) * getEffectivePxPerSec(zoom);
}
