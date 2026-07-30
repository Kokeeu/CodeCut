import { useMemo } from 'react';

export default function useEditor(clips, transitions) {
  const totalDuration = useMemo(() => {
    let total = clips.reduce((s, c) => s + (c.sourceEnd - c.sourceStart) / (c.speed || 1), 0);
    transitions.forEach((t) => {
      if (t && t.type && t.type !== 'none') total -= Number(t.durationSec) || 0;
    });
    return Math.max(0, total);
  }, [clips, transitions]);

  const cumulativeStarts = useMemo(() => {
    const starts = [];
    let cum = 0;
    for (let i = 0; i < clips.length; i++) {
      starts.push(cum);
      const dur = (clips[i].sourceEnd - clips[i].sourceStart) / (clips[i].speed || 1);
      cum += dur;
      if (i < clips.length - 1) {
        const t = transitions[i];
        if (t && t.type && t.type !== 'none') cum -= Number(t.durationSec) || 0;
      }
    }
    return starts;
  }, [clips, transitions]);

  const snapPoints = useMemo(() => {
    const points = [0];
    let cum = 0;
    for (let i = 0; i < clips.length; i++) {
      const dur = (clips[i].sourceEnd - clips[i].sourceStart) / (clips[i].speed || 1);
      cum += dur;
      points.push(cum);
      if (i < clips.length - 1) {
        const t = transitions[i];
        if (t && t.type && t.type !== 'none') cum -= Number(t.durationSec) || 0;
      }
    }
    return points;
  }, [clips, transitions]);

  const currentGlobalTime = useMemo(() => {
    return (activeClipId) => {
      const idx = clips.findIndex((c) => c.id === activeClipId);
      if (idx < 0) return 0;
      return cumulativeStarts[idx];
    };
  }, [clips, cumulativeStarts]);

  return { totalDuration, cumulativeStarts, snapPoints, currentGlobalTime };
}
