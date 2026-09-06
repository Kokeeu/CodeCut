const RESOLUTIONS = {
  720: { width: 720, height: 1280 },
  1080: { width: 1080, height: 1920 },
  1440: { width: 1440, height: 2560 },
  2160: { width: 2160, height: 3840 },
  2304: { width: 2304, height: 4096 },
};

const FPS_OPTIONS = new Set([24, 30, 60]);

const QUALITY_PROFILES = {
  medium: { crf: 23, preset: 'fast', audioBitrateKbps: 128 },
  high: { crf: 19, preset: 'medium', audioBitrateKbps: 192 },
  ultra: { crf: 16, preset: 'slow', audioBitrateKbps: 256 },
};

const BITRATE_CEILINGS_KBPS = {
  720: { medium: 4000, high: 7000, ultra: 12000 },
  1080: { medium: 8000, high: 12000, ultra: 20000 },
  1440: { medium: 14000, high: 22000, ultra: 35000 },
  2160: { medium: 28000, high: 45000, ultra: 68000 },
  2304: { medium: 30000, high: 48000, ultra: 72000 },
};

const FPS_BITRATE_MULTIPLIERS = { 24: 0.9, 30: 1, 60: 1.35 };

function normalizeExportConfig(config = {}) {
  const resolution = RESOLUTIONS[String(config.resolution)] ? String(config.resolution) : '1080';
  const fps = FPS_OPTIONS.has(Number(config.fps)) ? Number(config.fps) : 30;
  const quality = QUALITY_PROFILES[config.quality] ? config.quality : 'high';
  return { resolution, fps, quality };
}

function getEncodingSettings(config = {}) {
  const normalized = normalizeExportConfig(config);
  const dimensions = RESOLUTIONS[normalized.resolution];
  const quality = QUALITY_PROFILES[normalized.quality];
  const rawMaxRate = BITRATE_CEILINGS_KBPS[normalized.resolution][normalized.quality]
    * FPS_BITRATE_MULTIPLIERS[normalized.fps];
  const maxRateKbps = Math.round(rawMaxRate / 100) * 100;

  return {
    ...normalized,
    ...dimensions,
    ...quality,
    maxRateKbps,
    bufferSizeKbps: maxRateKbps * 2,
  };
}

module.exports = { getEncodingSettings, normalizeExportConfig };
