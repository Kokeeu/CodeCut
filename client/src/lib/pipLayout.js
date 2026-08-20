export const EXPORT_W = 1080;
export const EXPORT_H = 1920;
export const PIP_MARGIN = 20;

export function getPipRect(pip, outputW = EXPORT_W, outputH = EXPORT_H) {
  const sizePercent = Number(pip?.size) || 30;
  const width = Math.max(2, Math.round(outputW * (sizePercent / 100)));
  const height = Math.max(2, Math.round(width * 9 / 16));
  const margin = Math.round(PIP_MARGIN * (outputW / EXPORT_W));
  let x = margin;
  let y = margin;
  switch (pip?.position) {
    case 'top-right':
      x = outputW - width - margin;
      y = margin;
      break;
    case 'bottom-left':
      x = margin;
      y = outputH - height - margin;
      break;
    case 'bottom-right':
      x = outputW - width - margin;
      y = outputH - height - margin;
      break;
    case 'top-left':
    default:
      x = margin;
      y = margin;
      break;
  }
  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width,
    height,
  };
}

export function getTextAlignTransform(align) {
  if (align === 'center') return 'translateX(-50%)';
  if (align === 'right') return 'translateX(-100%)';
  return 'none';
}

export function getDrawtextX(align, tx) {
  if (align === 'center') return `${tx}-text_w/2`;
  if (align === 'right') return `${tx}-text_w`;
  return String(tx);
}
