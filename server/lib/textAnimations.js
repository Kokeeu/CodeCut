const ANIMATIONS = {
  'fade-in': {
    getFfmpegEnable(animDur, s) {
      return `if(lt(t-${s},${animDur}),(t-${s})/${animDur},1)`;
    },
  },
  'slide-up': {
    getFfmpegY(ty, animDur, s) {
      return `${ty}+80*(1-min(1,(t-${s})/${animDur}))`;
    },
  },
  'slide-left': {
    getFfmpegX(tx, animDur, s) {
      return `${tx}+120*(1-min(1,(t-${s})/${animDur}))`;
    },
  },
  'typewriter': {
    isTypewriter: true,
  },
  'bounce': {
    getFfmpegFontSize(size, animDur, s) {
      return `${size}*if(lt(t-${s},${animDur}*0.6),t-${s}/${animDur}*1.2,if(lt(t-${s},${animDur}*0.8),1.2-((t-${s}-${animDur}*0.6)/(${animDur}*0.2))*0.2,1))`;
    },
  },
  'scale-in': {
    getFfmpegFontSize(size, animDur, s) {
      return `${size}*min(1,(t-${s})/${animDur})`;
    },
  },
  'karaoke': {
    isKaraoke: true,
  },
};

function getAnimation(type) {
  return ANIMATIONS[type] || ANIMATIONS['fade-in'];
}

module.exports = { getAnimation };
