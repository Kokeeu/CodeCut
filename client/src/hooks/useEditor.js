import { useMemo } from 'react';
import {
  getTotalDuration,
  getClipStarts,
  getSnapPoints,
  globalTimeFromClipOffset,
} from '../lib/transitions.js';

export default function useEditor(clips, transitions) {
  const totalDuration = useMemo(
    () => getTotalDuration(clips, transitions),
    [clips, transitions]
  );

  const cumulativeStarts = useMemo(
    () => getClipStarts(clips, transitions),
    [clips, transitions]
  );

  const snapPoints = useMemo(
    () => getSnapPoints(clips, transitions),
    [clips, transitions]
  );

  const currentGlobalTime = useMemo(() => {
    return (activeClipId, sourceOffset = 0) =>
      globalTimeFromClipOffset(clips, transitions, activeClipId, sourceOffset);
  }, [clips, transitions]);

  return { totalDuration, cumulativeStarts, snapPoints, currentGlobalTime };
}
