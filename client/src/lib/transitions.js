export function clipOutputDuration(clip) {
  if (!clip) return 0;
  return Math.max(0, (Number(clip.sourceEnd) - Number(clip.sourceStart)) / (Number(clip.speed) || 1));
}

export function transitionDuration(transition, clipA, clipB) {
  if (!transition || !transition.type || transition.type === 'none') return 0;
  const requested = Number(transition.durationSec) || 0;
  if (requested <= 0) return 0;
  const maxDur = Math.max(0, Math.min(clipOutputDuration(clipA), clipOutputDuration(clipB)) - 0.02);
  return Math.min(requested, maxDur);
}

export function getClipStarts(clips, transitions = []) {
  const starts = [];
  let cum = 0;
  for (let i = 0; i < clips.length; i++) {
    starts.push(cum);
    cum += clipOutputDuration(clips[i]);
    if (i < clips.length - 1) {
      cum -= transitionDuration(transitions[i], clips[i], clips[i + 1]);
    }
  }
  return starts;
}

export function getTotalDuration(clips, transitions = []) {
  if (!clips.length) return 0;
  const starts = getClipStarts(clips, transitions);
  const last = clips.length - 1;
  return starts[last] + clipOutputDuration(clips[last]);
}

export function getSnapPoints(clips, transitions = []) {
  const starts = getClipStarts(clips, transitions);
  const points = [...starts];
  const total = getTotalDuration(clips, transitions);
  if (!points.length || Math.abs(points[points.length - 1] - total) > 1e-4) {
    points.push(total);
  }
  return points;
}

export function globalTimeFromClipOffset(clips, transitions, clipId, sourceOffset) {
  const idx = clips.findIndex((c) => c.id === clipId);
  if (idx < 0) return 0;
  const starts = getClipStarts(clips, transitions);
  const speed = Number(clips[idx].speed) || 1;
  return starts[idx] + Math.max(0, Number(sourceOffset) || 0) / speed;
}

export function resolvePlayback(clips, transitions, globalTime) {
  if (!clips.length) {
    return { index: -1, sourceOffset: 0, outputOffset: 0, incoming: null };
  }

  const starts = getClipStarts(clips, transitions);
  const total = getTotalDuration(clips, transitions);
  const g = Math.max(0, Math.min(Number(globalTime) || 0, Math.max(0, total - 1e-4)));

  for (let i = 0; i < clips.length; i++) {
    const start = starts[i];
    const dur = clipOutputDuration(clips[i]);
    const end = start + dur;
    const transDur = i < clips.length - 1
      ? transitionDuration(transitions[i], clips[i], clips[i + 1])
      : 0;
    const overlapStart = end - transDur;
    const speed = Number(clips[i].speed) || 1;

    if (g < start) {
      return { index: i, sourceOffset: 0, outputOffset: 0, incoming: null };
    }

    if (transDur > 0 && i < clips.length - 1 && g >= overlapStart && g < end) {
      const next = clips[i + 1];
      const nextSpeed = Number(next.speed) || 1;
      return {
        index: i,
        sourceOffset: (g - start) * speed,
        outputOffset: g - start,
        incoming: {
          index: i + 1,
          sourceOffset: (g - starts[i + 1]) * nextSpeed,
          outputOffset: g - starts[i + 1],
          progress: (g - overlapStart) / transDur,
          type: transitions[i].type,
          duration: transDur,
        },
      };
    }

    if (g < overlapStart || (transDur <= 0 && g < end) || i === clips.length - 1) {
      return {
        index: i,
        sourceOffset: Math.max(0, g - start) * speed,
        outputOffset: Math.max(0, g - start),
        incoming: null,
      };
    }
  }

  const last = clips.length - 1;
  const dur = clipOutputDuration(clips[last]);
  const speed = Number(clips[last].speed) || 1;
  return { index: last, sourceOffset: dur * speed, outputOffset: dur, incoming: null };
}

export function getPreviewTransitionStyles(type, progress) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0));
  switch (type) {
    case 'fadeblack':
      return {
        incomingOnTop: true,
        outgoing: { opacity: p < 0.5 ? 1 - p * 2 : 0 },
        incoming: { opacity: p < 0.5 ? 0 : (p - 0.5) * 2 },
        veil: { background: '#000', opacity: p < 0.5 ? p * 2 : (1 - p) * 2 },
        audioOut: 1 - p,
        audioIn: p,
      };
    case 'fadewhite':
      return {
        incomingOnTop: true,
        outgoing: { opacity: p < 0.5 ? 1 - p * 2 : 0 },
        incoming: { opacity: p < 0.5 ? 0 : (p - 0.5) * 2 },
        veil: { background: '#fff', opacity: p < 0.5 ? p * 2 : (1 - p) * 2 },
        audioOut: 1 - p,
        audioIn: p,
      };
    case 'wipeleft':
      return {
        incomingOnTop: true,
        outgoing: { opacity: 1 },
        incoming: { clipPath: `inset(0 0 0 ${(1 - p) * 100}%)` },
        veil: null,
        audioOut: 1 - p,
        audioIn: p,
      };
    case 'wiperight':
      return {
        incomingOnTop: true,
        outgoing: { opacity: 1 },
        incoming: { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` },
        veil: null,
        audioOut: 1 - p,
        audioIn: p,
      };
    case 'slideleft':
      return {
        incomingOnTop: true,
        outgoing: { transform: `translateX(${-p * 100}%)` },
        incoming: { transform: `translateX(${(1 - p) * 100}%)` },
        veil: null,
        audioOut: 1 - p,
        audioIn: p,
      };
    case 'slideright':
      return {
        incomingOnTop: true,
        outgoing: { transform: `translateX(${p * 100}%)` },
        incoming: { transform: `translateX(${-(1 - p) * 100}%)` },
        veil: null,
        audioOut: 1 - p,
        audioIn: p,
      };
    case 'circleopen':
      return {
        incomingOnTop: true,
        outgoing: { opacity: 1 },
        incoming: { clipPath: `circle(${Math.max(0, p) * 80}% at 50% 50%)` },
        veil: null,
        audioOut: 1 - p,
        audioIn: p,
      };
    case 'circleclose':
      return {
        incomingOnTop: false,
        outgoing: { clipPath: `circle(${Math.max(0, 1 - p) * 80}% at 50% 50%)` },
        incoming: { opacity: 1 },
        veil: null,
        audioOut: 1 - p,
        audioIn: p,
      };
    case 'fade':
    default:
      return {
        incomingOnTop: true,
        outgoing: { opacity: 1 - p },
        incoming: { opacity: p },
        veil: null,
        audioOut: 1 - p,
        audioIn: p,
      };
  }
}
