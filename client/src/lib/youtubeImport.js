const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
const NOCOOKIE_HOSTS = new Set(['youtube-nocookie.com', 'www.youtube-nocookie.com']);

export const YOUTUBE_QUALITY_OPTIONS = [
  { value: 720, label: '720p' },
  { value: 1080, label: '1080p' },
  { value: 1440, label: '1440p / 2K' },
  { value: 2160, label: '2160p / 4K' },
];

export function normalizeYouTubeUrl(input) {
  let url;
  try {
    url = new URL(String(input || '').trim());
  } catch (_) {
    throw new Error('URL inválida.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('Solo se permiten enlaces HTTPS públicos de YouTube.');
  }

  const host = url.hostname.toLowerCase();
  let id = null;
  if (host === 'youtu.be') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 1) id = parts[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    const match = url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)\/?$/);
    if (!id && match) id = match[1];
  } else if (NOCOOKIE_HOSTS.has(host)) {
    const match = url.pathname.match(/^\/embed\/([^/]+)\/?$/);
    if (match) id = match[1];
  } else {
    throw new Error('El enlace no pertenece a YouTube.');
  }

  if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) {
    throw new Error('El enlace no identifica un video individual.');
  }
  return `https://www.youtube.com/watch?v=${id}`;
}

export function parseYouTubeInput(text, limit) {
  const inputs = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (inputs.length === 0) throw new Error('Pega al menos un enlace de YouTube.');
  if (limit <= 0) throw new Error('El media pool ya está lleno.');
  if (inputs.length > limit) throw new Error(`Puedes importar ${limit} video${limit === 1 ? '' : 's'} más.`);

  const seen = new Set();
  const urls = [];
  inputs.forEach((input, index) => {
    try {
      const normalized = normalizeYouTubeUrl(input);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        urls.push(normalized);
      }
    } catch (error) {
      throw new Error(`Enlace ${index + 1}: ${error.message}`);
    }
  });
  return urls;
}

export function filenameFromResponse(response, fallback = 'youtube-video.mp4') {
  const encoded = response.headers.get('X-Codecut-Filename');
  if (!encoded) return fallback;
  try {
    return decodeURIComponent(encoded);
  } catch (_) {
    return fallback;
  }
}

export function mimeForFileName(name, responseType = '') {
  if (String(name).toLowerCase().endsWith('.webm')) return 'video/webm';
  if (responseType.startsWith('video/')) return responseType;
  return 'video/mp4';
}
