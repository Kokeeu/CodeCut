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

function getKaraokeTokens(text) {
  const parts = String(text || '').match(/\S+|\s+/g) || [];
  const wordIndexes = [];
  parts.forEach((part, i) => {
    if (/\S/.test(part)) wordIndexes.push(i);
  });
  return { parts, wordIndexes };
}

function getKaraokeSegments(text, startTime, animDuration, totalDuration) {
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

function getTypewriterSegments(text, startTime, animDuration, totalDuration) {
  if (!text || text.length === 0) return [];

  const chars = text.split('');
  const numChars = chars.length;
  const segmentDuration = animDuration / numChars;
  const segments = [];

  for (let i = 0; i < numChars; i++) {
    const segmentStart = startTime + (i * segmentDuration);
    const segmentEnd = i === numChars - 1 ? startTime + totalDuration : startTime + animDuration;
    const segmentText = chars.slice(0, i + 1).join('');

    segments.push({
      text: segmentText,
      startTime: segmentStart,
      endTime: segmentEnd,
    });
  }

  return segments;
}

function getAnimation(type) {
  return ANIMATIONS[type] || ANIMATIONS['fade-in'];
}

module.exports = { getAnimation, getTypewriterSegments, getKaraokeSegments };
