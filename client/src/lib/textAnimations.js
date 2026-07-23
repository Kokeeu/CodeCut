const ANIMATIONS = {
  'fade-in': {
    label: 'Fade In',
    getPreviewStyle(progress) {
      return { opacity: Math.min(1, progress) };
    },
    getFfmpegEnable(animDur) {
      return `if(lt(t-s,${animDur}),(t-s)/${animDur},1)`;
    },
  },
  'slide-up': {
    label: 'Slide Up',
    getPreviewStyle(progress, tx, ty) {
      const offset = 80 * (1 - Math.min(1, progress));
      return { transform: `translateY(${offset}px)` };
    },
    getFfmpegY(ty, animDur) {
      return `${ty}+80*(1-min(1,(t-s)/${animDur}))`;
    },
  },
  'slide-left': {
    label: 'Slide Left',
    getPreviewStyle(progress, tx, ty) {
      const offset = 120 * (1 - Math.min(1, progress));
      return { transform: `translateX(${offset}px)` };
    },
    getFfmpegX(tx, animDur) {
      return `${tx}+120*(1-min(1,(t-s)/${animDur}))`;
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
    getFfmpegFontSize(size, animDur) {
      return `${size}*if(lt(t-s,${animDur}*0.6),t-s/${animDur}*1.2,if(lt(t-s,${animDur}*0.8),1.2-((t-s-${animDur}*0.6)/(${animDur}*0.2))*0.2,1))`;
    },
  },
  'scale-in': {
    label: 'Scale In',
    getPreviewStyle(progress) {
      return { transform: `scale(${Math.min(1, progress)})` };
    },
    getFfmpegFontSize(size, animDur) {
      return `${size}*min(1,(t-s)/${animDur})`;
    },
  },
  'karaoke': {
    label: 'Karaoke',
    isKaraoke: true,
    getPreviewStyle(progress) {
      return { opacity: 1 };
    },
  },
};

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
