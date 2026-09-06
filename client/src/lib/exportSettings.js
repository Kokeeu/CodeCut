export const DEFAULT_EXPORT_CONFIG = {
  resolution: '1080',
  fps: 30,
  quality: 'high',
  platform: 'tiktok',
};

export const PLATFORM_PRESETS = {
  tiktok: { label: 'TikTok', resolution: '1080', fps: 30, quality: 'high', icon: '📱' },
  reels: { label: 'Reels', resolution: '1080', fps: 30, quality: 'high', icon: '📸' },
  shorts: { label: 'Shorts', resolution: '1080', fps: 60, quality: 'high', icon: '▶️' },
  custom: { label: 'Custom', icon: '⚙️' },
};

export const RESOLUTIONS = [
  { value: '720', width: 720, height: 1280, label: '720p (720x1280)' },
  { value: '1080', width: 1080, height: 1920, label: '1080p (1080x1920) · recommended' },
  { value: '1440', width: 1440, height: 2560, label: '1440p (1440x2560)' },
  { value: '2160', width: 2160, height: 3840, label: '4K UHD (2160x3840)' },
  { value: '2304', width: 2304, height: 4096, label: 'TikTok API max (2304x4096)' },
];

export const FPS_OPTIONS = [
  { value: 24, label: '24 fps' },
  { value: 30, label: '30 fps' },
  { value: 60, label: '60 fps' },
];

export const QUALITY_OPTIONS = [
  { value: 'medium', label: 'Efficient', description: 'Smaller file' },
  { value: 'high', label: 'High', description: 'Recommended' },
  { value: 'ultra', label: 'Master', description: 'Maximum quality' },
];

const QUALITY_DETAILS = {
  medium: { crf: 23, audioBitrateKbps: 128 },
  high: { crf: 19, audioBitrateKbps: 192 },
  ultra: { crf: 16, audioBitrateKbps: 256 },
};

const BITRATE_CEILINGS_KBPS = {
  720: { medium: 4000, high: 7000, ultra: 12000 },
  1080: { medium: 8000, high: 12000, ultra: 20000 },
  1440: { medium: 14000, high: 22000, ultra: 35000 },
  2160: { medium: 28000, high: 45000, ultra: 68000 },
  2304: { medium: 30000, high: 48000, ultra: 72000 },
};

const FPS_BITRATE_MULTIPLIERS = { 24: 0.9, 30: 1, 60: 1.35 };

export function getExportEncodingSummary(config = DEFAULT_EXPORT_CONFIG) {
  const resolution = RESOLUTIONS.find((option) => option.value === String(config.resolution)) || RESOLUTIONS[1];
  const fps = FPS_OPTIONS.some((option) => option.value === Number(config.fps)) ? Number(config.fps) : 30;
  const quality = QUALITY_DETAILS[config.quality] ? config.quality : 'high';
  const details = QUALITY_DETAILS[quality];
  const rawMaxRate = BITRATE_CEILINGS_KBPS[resolution.value][quality] * FPS_BITRATE_MULTIPLIERS[fps];
  const maxVideoBitrateKbps = Math.round(rawMaxRate / 100) * 100;
  const maxMegabytesPerMinute = Math.ceil((maxVideoBitrateKbps + details.audioBitrateKbps) * 60 / 8 / 1024);

  return {
    ...resolution,
    fps,
    quality,
    crf: details.crf,
    audioBitrateKbps: details.audioBitrateKbps,
    maxVideoBitrateKbps,
    maxVideoBitrateMbps: maxVideoBitrateKbps / 1000,
    maxMegabytesPerMinute,
  };
}
