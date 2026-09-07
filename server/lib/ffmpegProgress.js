function parseTimestamp(value) {
  const parts = String(value || '').split(':');
  if (parts.length !== 3) return 0;
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  const seconds = Number(parts[2]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function parseFfmpegProgress(line, totalDuration, totalFrames) {
  const timeMatch = line.match(/time=\s*(\d+:\d+:\d+(?:\.\d+)?)/);
  const frameMatch = line.match(/frame=\s*(\d+)/);
  if (!timeMatch && !frameMatch) return null;
  const timeProgress = timeMatch && totalDuration > 0
    ? parseTimestamp(timeMatch[1]) / totalDuration
    : 0;
  const frameProgress = frameMatch && totalFrames > 0
    ? Number(frameMatch[1]) / totalFrames
    : 0;
  return Math.max(timeProgress, frameProgress);
}

module.exports = { parseTimestamp, parseFfmpegProgress };
