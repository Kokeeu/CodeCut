const EXPORT_W = 1080;
const EXPORT_H = 1920;

export const MAX_COLLABORATIVE_PARTICIPANTS = 6;

export function clampRating(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(10, Math.max(0, number));
}

export function formatRating(value) {
  return clampRating(value).toFixed(1);
}

export function getCollaborativeTotal(participants = [], scores = {}) {
  return participants
    .slice(0, MAX_COLLABORATIVE_PARTICIPANTS)
    .reduce((total, participant) => total + clampRating(scores?.[participant.id]), 0);
}

export function clampCollaborativeTotal(value, participantCount) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  const maximum = Math.max(0, Math.min(MAX_COLLABORATIVE_PARTICIPANTS, participantCount || 0)) * 10;
  return Math.min(maximum, Math.max(0, number));
}

export function formatCollaborativeTotal(participants, scores, manualTotal) {
  const total = manualTotal === undefined || manualTotal === null || manualTotal === ''
    ? getCollaborativeTotal(participants, scores)
    : clampCollaborativeTotal(manualTotal, participants.length);
  return total.toFixed(1);
}

export function getCollaborativeLayout(count) {
  const safeCount = Math.max(1, Math.min(MAX_COLLABORATIVE_PARTICIPANTS, count || 1));
  const compact = safeCount > 4;
  const columns = compact ? 3 : safeCount;
  const rows = Math.ceil(safeCount / columns);
  const gap = compact ? 18 : 22;
  const left = 54;
  const width = 972;
  const cardWidth = (width - gap * (columns - 1)) / columns;
  const cardHeight = compact ? 184 : safeCount === 4 ? 318 : 342;
  const top = compact ? 1250 : 1270;
  const rowGap = compact ? 18 : 0;
  const totalY = top + rows * cardHeight + (rows - 1) * rowGap + 28;
  const avatarSize = compact ? 82 : safeCount === 4 ? 112 : safeCount === 3 ? 132 : 152;
  const nameSize = compact ? 27 : safeCount === 4 ? 30 : 34;
  const scoreSize = compact ? 48 : safeCount === 4 ? 62 : 78;
  return {
    columns,
    gap,
    left,
    width,
    cardWidth,
    cardHeight,
    top,
    rowGap,
    totalY,
    avatarSize,
    nameSize,
    scoreSize,
  };
}

export function getCollaborativeCardRect(index, layout) {
  const column = index % layout.columns;
  const row = Math.floor(index / layout.columns);
  return {
    x: layout.left + column * (layout.cardWidth + layout.gap),
    y: layout.top + row * (layout.cardHeight + layout.rowGap),
    width: layout.cardWidth,
    height: layout.cardHeight,
  };
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function roundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth, initialSize, minSize) {
  let size = initialSize;
  while (size > minSize) {
    ctx.font = `800 ${size}px Inter, Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

export async function resizeParticipantImage(file, size = 320) {
  if (!file) return null;
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
  const image = await loadImage(source);
  if (!image) throw new Error('La imagen no es válida.');
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

export async function renderCollaborativeOverlay(meta, clip) {
  const ranking = meta?.collaborativeRanking;
  const rating = clip?.collaborativeRating;
  if (!ranking?.enabled || !rating?.enabled) return null;
  const participants = (ranking.participants || []).slice(0, MAX_COLLABORATIVE_PARTICIPANTS);
  if (participants.length === 0) return null;

  const images = await Promise.all(participants.map((participant) => loadImage(participant.image)));
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_W;
  canvas.height = EXPORT_H;
  const ctx = canvas.getContext('2d');
  const layout = getCollaborativeLayout(participants.length);

  participants.forEach((participant, index) => {
    const rect = getCollaborativeCardRect(index, layout);
    const accent = participant.accent || '#1688ff';
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = 'rgba(5, 10, 28, 0.90)';
    roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, 28);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    roundedRect(ctx, rect.x + 2, rect.y + 2, rect.width - 4, rect.height - 4, 26);
    ctx.stroke();

    const compact = participants.length > 4;
    const avatarX = compact ? rect.x + 24 : rect.x + (rect.width - layout.avatarSize) / 2;
    const avatarY = compact ? rect.y + (rect.height - layout.avatarSize) / 2 : rect.y + 24;
    const avatarRadius = layout.avatarSize / 2;
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius + 5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2);
    ctx.clip();
    if (images[index]) {
      ctx.drawImage(images[index], avatarX, avatarY, layout.avatarSize, layout.avatarSize);
    } else {
      ctx.fillStyle = '#111827';
      ctx.fillRect(avatarX, avatarY, layout.avatarSize, layout.avatarSize);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(layout.avatarSize * 0.42)}px Inter, Arial, sans-serif`;
      ctx.fillText((participant.name || '?').trim().charAt(0).toUpperCase() || '?', avatarX + avatarRadius, avatarY + avatarRadius + 2);
    }
    ctx.restore();

    const name = (participant.name || `Participante ${index + 1}`).trim().toUpperCase();
    const score = formatRating(rating.scores?.[participant.id]);
    ctx.textAlign = compact ? 'left' : 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    if (compact) {
      const textX = avatarX + layout.avatarSize + 22;
      const nameSize = fitText(ctx, name, rect.x + rect.width - textX - 18, layout.nameSize, 19);
      ctx.font = `800 ${nameSize}px Inter, Arial, sans-serif`;
      ctx.fillText(name, textX, rect.y + 72);
      ctx.font = `800 ${layout.scoreSize}px Inter, Arial, sans-serif`;
      ctx.fillText(score, textX, rect.y + 137);
    } else {
      const nameSize = fitText(ctx, name, rect.width - 32, layout.nameSize, 20);
      ctx.font = `800 ${nameSize}px Inter, Arial, sans-serif`;
      ctx.fillText(name, rect.x + rect.width / 2, avatarY + layout.avatarSize + 48);
      ctx.font = `800 ${layout.scoreSize}px Inter, Arial, sans-serif`;
      ctx.fillText(score, rect.x + rect.width / 2, rect.y + rect.height - 26);
    }
    ctx.restore();
  });

  const totalText = `TOTAL ${formatCollaborativeTotal(participants, rating.scores, rating.total)}`;
  const totalWidth = Math.max(390, Math.min(610, 210 + totalText.length * 25));
  const totalX = (EXPORT_W - totalWidth) / 2;
  const totalHeight = 104;
  const totalY = Math.min(layout.totalY, EXPORT_H - totalHeight - 55);
  ctx.save();
  ctx.shadowColor = 'rgba(22, 136, 255, 0.52)';
  ctx.shadowBlur = 28;
  ctx.fillStyle = 'rgba(10, 8, 30, 0.96)';
  roundedRect(ctx, totalX, totalY, totalWidth, totalHeight, 52);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 5;
  roundedRect(ctx, totalX + 2.5, totalY + 2.5, totalWidth - 5, totalHeight - 5, 49);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 49px Inter, Arial, sans-serif';
  ctx.fillText(totalText, EXPORT_W / 2, totalY + totalHeight / 2 + 2);
  ctx.restore();

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
