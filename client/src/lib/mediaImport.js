import { extractWaveform } from './waveform.js';

export const MAX_MEDIA_FILES = 10;
export const MAX_MEDIA_FILE_MB = 1024;
export const MAX_MEDIA_FILE_BYTES = MAX_MEDIA_FILE_MB * 1024 * 1024;
export const PERSISTENT_MEDIA_MAX_BYTES = 200 * 1024 * 1024;

export function validateMediaFile(file) {
  if (!file) return 'No file was selected.';
  if (!file.type?.startsWith('video/')) return `"${file.name}" is not a video.`;
  if (file.size > MAX_MEDIA_FILE_BYTES) {
    const sizeMb = file.size / (1024 * 1024);
    return `"${file.name}" is too large (${sizeMb.toFixed(0)} MB). Max ${MAX_MEDIA_FILE_MB} MB.`;
  }
  return null;
}

function generateFilmstrip(videoUrl, duration, numFrames = 20) {
  return new Promise((resolve) => {
    if (!duration || duration <= 0 || numFrames <= 0) {
      resolve(null);
      return;
    }
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.src = videoUrl;

    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      video.removeAttribute('src');
      video.load();
      resolve(value);
    };
    const timeout = setTimeout(() => finish(null), 15000);

    video.onloadedmetadata = async () => {
      try {
        const vw = video.videoWidth || 0;
        const vh = video.videoHeight || 0;
        if (!vw || !vh) {
          finish(null);
          return;
        }
        const frameW = 96;
        const frameH = Math.round((vh / vw) * frameW);
        const canvas = document.createElement('canvas');
        canvas.width = numFrames * frameW;
        canvas.height = frameH;
        const ctx = canvas.getContext('2d');
        const interval = duration / numFrames;

        for (let i = 0; i < numFrames; i++) {
          const t = Math.min(i * interval + interval / 2, Math.max(0, duration - 0.05));
          video.currentTime = Math.max(0, t);
          await new Promise((res) => { video.onseeked = res; });
          ctx.drawImage(video, i * frameW, 0, frameW, frameH);
        }
        finish(canvas.toDataURL('image/jpeg', 0.5));
      } catch (_) {
        finish(null);
      }
    };
    video.onerror = () => finish(null);
  });
}

export function extractMediaMetadata(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = url;

    let done = false;
    const finish = async (duration, thumbnail) => {
      if (done) return;
      done = true;
      clearTimeout(timer);

      let waveform = null;
      let filmstrip = null;
      if (file.size <= PERSISTENT_MEDIA_MAX_BYTES) {
        try {
          waveform = await extractWaveform(url, 200);
        } catch (_) {}
      }
      try {
        filmstrip = await generateFilmstrip(url, duration, 20);
      } catch (_) {}

      resolve({ file, url, duration, thumbnail, waveform, filmstrip });
    };

    const timer = setTimeout(() => finish(0, null), 5000);

    const captureFrame = (duration) => {
      try {
        const canvas = document.createElement('canvas');
        const w = 160;
        const h = video.videoWidth > 0 ? Math.round((video.videoHeight / video.videoWidth) * w) : 90;
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);
        finish(duration, canvas.toDataURL('image/jpeg', 0.6));
      } catch (_) {
        finish(duration, null);
      }
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const t = Math.min(0.5, duration / 2 || 0);
      if (t > 0.01) {
        try {
          video.currentTime = t;
          video.onseeked = () => captureFrame(duration);
        } catch (_) {
          finish(duration, null);
        }
      } else {
        captureFrame(duration);
      }
    };
    video.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      if (!done) {
        done = true;
        resolve(null);
      }
    };
  });
}
