const ANIMATIONS = {
  'fade-in': {
    label: 'Fade In',
    getPreviewStyle(progress) {
      return { opacity: Math.min(1, progress) };
    },
    getFfmpegEnable(animDur, s) {
      return `if(lt(t-${s},${animDur}),(t-${s})/${animDur},1)`;
    },
  },
  'slide-up': {
    label: 'Slide Up',
    getPreviewStyle(progress) {
      const offset = 80 * (1 - Math.min(1, progress));
      return { transform: `translateY(${offset}px)` };
    },
    getFfmpegY(ty, animDur, s) {
      return `${ty}+80*(1-min(1,(t-${s})/${animDur}))`;
    },
  },
  'slide-left': {
    label: 'Slide Left',
    getPreviewStyle(progress) {
      const offset = 120 * (1 - Math.min(1, progress));
      return { transform: `translateX(${offset}px)` };
    },
    getFfmpegX(tx, animDur, s) {
      return `${tx}+120*(1-min(1,(t-${s})/${animDur}))`;
    },
  },
  'typewriter': {
    label: 'Typewriter',
    getPreviewStyle(progress, tx, ty, text) {
      const len = (text || '').length;
      const visibleChars = Math.floor(Math.min(1, progress) * len);
      return { _visibleText: (text || '').slice(0, visibleChars) };
    },
    isTypewriter: true,
  },
  'bounce': {
    label: 'Bounce',
    getPreviewStyle(progress) {
      const p = Math.min(1, progress);
      let scale;
      if (p < 0.6) {
        scale = (p / 0.6) * 1.2;
      } else if (p < 0.8) {
        scale = 1.2 - ((p - 0.6) / 0.2) * 0.2;
      } else {
        scale = 1;
      }
      return { transform: `scale(${scale})` };
    },
    getFfmpegFontSize(size, animDur, s) {
      return `${size}*if(lt(t-${s},${animDur}*0.6),t-${s}/${animDur}*1.2,if(lt(t-${s},${animDur}*0.8),1.2-((t-${s}-${animDur}*0.6)/(${animDur}*0.2))*0.2,1))`;
    },
  },
  'scale-in': {
    label: 'Scale In',
    getPreviewStyle(progress) {
      return { transform: `scale(${Math.min(1, progress)})` };
    },
    getFfmpegFontSize(size, animDur, s) {
      return `${size}*min(1,(t-${s})/${animDur})`;
    },
  },
  'karaoke': {
    label: 'Karaoke',
    isKaraoke: true,
    getPreviewStyle(progress, tx, ty, text) {
      return { _karaokeHighlight: getKaraokeHighlight(text || '', progress) };
    },
  },
};

export function getKaraokeTokens(text) {
  const parts = String(text || '').match(/\S+|\s+/g) || [];
  const wordIndexes = [];
  parts.forEach((part, i) => {
    if (/\S/.test(part)) wordIndexes.push(i);
  });
  return { parts, wordIndexes };
}

export function getKaraokeHighlight(text, progress) {
  const { parts, wordIndexes } = getKaraokeTokens(text);
  const n = Math.max(1, wordIndexes.length);
  const count = Math.max(0, Math.min(n, Math.floor(Math.min(1, progress) * n + 1e-9)));
  if (count <= 0) return '';
  const lastPart = wordIndexes[count - 1];
  return parts.slice(0, lastPart + 1).join('');
}

export function getKaraokeSegments(text, startTime, animDuration, totalDuration) {
  const { parts, wordIndexes } = getKaraokeTokens(text);
  if (wordIndexes.length === 0) return [];
  const n = wordIndexes.length;
  const wordDur = Math.max(0.01, Number(animDuration) || 0.5) / n;
  const endTime = startTime + Math.max(Number(totalDuration) || 0, Number(animDuration) || 0);
  return wordIndexes.map((partIndex, k) => ({
    text: parts.slice(0, partIndex + 1).join(''),
    startTime: startTime + k * wordDur,
    endTime,
  }));
}

export function getAnimation(type) {
  return ANIMATIONS[type] || ANIMATIONS['fade-in'];
}

export function getAnimationTypes() {
  return Object.entries(ANIMATIONS).map(([value, def]) => ({
    value,
    label: def.label,
  }));
}

export function getPreviewAnimationStyle(type, progress, tx, ty, text) {
  const anim = getAnimation(type);
  if (!anim.getPreviewStyle) return {};
  return anim.getPreviewStyle(progress, tx, ty, text) || {};
}
