export const LAYOUTS = { vice: 'Vice Cover', poster: 'Poster', triptych: 'Triptych', strip: 'Strip' };
export const GRADES = { sunset: 'Vice Sunset', neon: 'Neon Night', golden: 'Golden Hour', noir: 'Palm Noir' };
export const SIZES = { square: [1080, 1080], portrait: [1080, 1350], wide: [1920, 1080], story: [1080, 1920] };

const PALETTES = {
  sunset: {
    skyTop: '#ff2e88',
    skyMid: '#ff7a18',
    skyBot: '#2b0a4a',
    sun: '#ff963f',
    sunCore: '#fff0ad',
    accent: '#ff2e88',
    accent2: '#ffcf73',
    band: '#2b0a4a',
    bandText: '#ffd9eb',
    gradeOverlay: 'rgba(220, 35, 111, 0.19)',
    halftone: '#421452',
    silhouette: '#15071f',
  },
  neon: {
    skyTop: '#360951',
    skyMid: '#ff00a8',
    skyBot: '#0b0018',
    sun: '#ff00a8',
    sunCore: '#ffc4f5',
    accent: '#ff00a8',
    accent2: '#00e5ff',
    band: '#150624',
    bandText: '#baf7ff',
    gradeOverlay: 'rgba(88, 27, 187, 0.24)',
    halftone: '#00e5ff',
    silhouette: '#080010',
  },
  golden: {
    skyTop: '#ff5e3a',
    skyMid: '#ffb347',
    skyBot: '#3a1503',
    sun: '#ffb347',
    sunCore: '#fff4cd',
    accent: '#ff5e3a',
    accent2: '#ffcf83',
    band: '#3a1503',
    bandText: '#ffe8c3',
    gradeOverlay: 'rgba(191, 94, 26, 0.20)',
    halftone: '#682615',
    silhouette: '#241005',
  },
  noir: {
    skyTop: '#55504d',
    skyMid: '#bfb5aa',
    skyBot: '#201c1b',
    sun: '#c7bfb6',
    sunCore: '#f5efe8',
    accent: '#ff4d6d',
    accent2: '#ff4d6d',
    band: '#292423',
    bandText: '#e9ded5',
    gradeOverlay: 'rgba(70, 64, 61, 0.26)',
    halftone: '#372e2c',
    silhouette: '#141111',
  },
};

const FONT_STACK = "'Bebas Neue', 'Arial Narrow', sans-serif";
const TAU = 2 * Math.PI;
const inkCache = new WeakMap();

function rect(x, y, w, h) {
  return { x, y, w, h };
}

export function layoutPanels(layout, W, H) {
  const gap = 6 * W / 1080;
  let panels;
  let bandFraction;

  switch (layout) {
    case 'poster':
      bandFraction = 0.26;
      panels = [rect(0, 0, W, H)];
      break;
    case 'triptych':
    case 'strip': {
      const count = layout === 'triptych' ? 3 : 2;
      bandFraction = layout === 'triptych' ? 0.26 : 0.32;
      const width = (W - (count + 1) * gap) / count;
      const height = H * (1 - bandFraction) - 2 * gap;
      panels = Array.from({ length: count }, (_, index) =>
        rect(gap + index * (width + gap), gap, width, height));
      break;
    }
    default: {
      bandFraction = 0.22;
      const photoHeight = H * 0.62;
      const innerWidth = W - 3 * gap;
      const heroWidth = innerWidth * 0.62;
      const sideWidth = innerWidth - heroWidth;
      const sideHeight = (photoHeight - 2 * gap) / 2;
      const sideX = heroWidth + 2 * gap;
      panels = [
        rect(gap, gap, heroWidth, photoHeight - gap),
        rect(sideX, gap, sideWidth, sideHeight),
        rect(sideX, sideHeight + 2 * gap, sideWidth, sideHeight),
      ];
    }
  }

  // Empty slots keep panel indices stable across layouts.
  while (panels.length < 3) panels.push(rect(0, 0, 0, 0));

  const title = rect(0, H * (1 - bandFraction), W, H * bandFraction);
  const tagW = 22 * gap;
  const tagH = Math.min(6 * gap, title.h * 0.24);
  const tag = rect(W - tagW - 4 * gap, title.y + 3 * gap, tagW, tagH);
  return { panels, title, tag };
}

function imageExtent(imgW, imgH, rectW, rectH, scale, fit) {
  if (!(imgW > 0 && imgH > 0 && rectW > 0 && rectH > 0)) {
    return { dw: 0, dh: 0 };
  }

  const contain = fit === 'fit';
  const zoom = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const base = contain
    ? Math.min(rectW / imgW, rectH / imgH)
    : Math.max(rectW / imgW, rectH / imgH);
  const factor = base * (contain ? zoom : Math.max(1, zoom));
  const width = imgW * factor;
  const height = imgH * factor;

  return {
    dw: contain ? width : Math.max(rectW, width),
    dh: contain ? height : Math.max(rectH, height),
  };
}

// Pan offsets are fractions of the panel's width and height, measured from center.
function clampAxis(offset, panelSize, imageSize) {
  if (!(panelSize > 0 && imageSize > 0) || !Number.isFinite(offset)) return 0;
  const limit = Math.abs(imageSize - panelSize) / (2 * panelSize);
  return Math.max(-limit, Math.min(limit, offset));
}

export function clampPan(imgW, imgH, rectW, rectH, scale, ox, oy, fit) {
  const { dw, dh } = imageExtent(imgW, imgH, rectW, rectH, scale, fit);
  return { ox: clampAxis(ox, rectW, dw), oy: clampAxis(oy, rectH, dh) };
}

export function coverTransform(imgW, imgH, rectW, rectH, scale, ox, oy, fit) {
  const { dw, dh } = imageExtent(imgW, imgH, rectW, rectH, scale, fit);
  return {
    dw,
    dh,
    dx: (rectW - dw) / 2 + clampAxis(ox, rectW, dw) * rectW,
    dy: (rectH - dh) / 2 + clampAxis(oy, rectH, dh) * rectH,
  };
}

function roundedPath(ctx, { x, y, w, h }, radius) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function insetRect({ x, y, w, h }, amount) {
  const inset = Math.min(amount, w / 2, h / 2);
  return rect(x + inset, y + inset, w - 2 * inset, h - 2 * inset);
}

function paintSky(ctx, box, palette) {
  const sky = ctx.createLinearGradient(0, box.y, 0, box.y + box.h);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(0.49, palette.skyMid);
  sky.addColorStop(1, palette.skyBot);
  ctx.fillStyle = sky;
  ctx.fillRect(box.x, box.y, box.w, box.h);
}

function drawSlicedSun(ctx, x, y, radius, palette) {
  const glow = ctx.createRadialGradient(x, y, radius * 0.45, x, y, radius * 1.55);
  glow.addColorStop(0, `${palette.sunCore}70`);
  glow.addColorStop(0.54, `${palette.sun}48`);
  glow.addColorStop(1, `${palette.sun}00`);
  const reach = radius * 1.55;
  ctx.fillStyle = glow;
  ctx.fillRect(x - reach, y - reach, reach * 2, reach * 2);

  const top = y - radius;
  const diameter = radius * 2;
  const disc = ctx.createLinearGradient(0, top, 0, top + diameter);
  disc.addColorStop(0, palette.sunCore);
  disc.addColorStop(0.88, palette.sun);

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.clip();
  ctx.fillStyle = disc;

  let start = 0;
  for (const [sliceAt, gap] of [[0.54, 0.014], [0.65, 0.024], [0.75, 0.034], [0.84, 0.044], [0.92, 0.055]]) {
    ctx.fillRect(x - radius, top + start * diameter, diameter, (sliceAt - start) * diameter);
    start = sliceAt + gap;
  }
  ctx.fillRect(x - radius, top + start * diameter, diameter, (1 - start) * diameter);
  ctx.restore();
}

const PALM_FRONDS = [
  [-0.48, 0.14, 0.11],
  [-0.53, -0.03, 0.15],
  [-0.35, -0.22, 0.10],
  [0.06, -0.31, 0.09],
  [0.39, -0.20, 0.12],
  [0.54, -0.03, 0.14],
  [0.43, 0.16, 0.12],
];

function drawPalm(ctx, x, base, height, lean, color) {
  const crownX = x + height * lean;
  const crownY = base - height;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - height * 0.045, base);
  ctx.bezierCurveTo(x - height * 0.035, base - height * 0.38,
    crownX - height * 0.10, crownY + height * 0.29, crownX - height * 0.016, crownY);
  ctx.lineTo(crownX + height * 0.017, crownY);
  ctx.bezierCurveTo(crownX - height * 0.03, crownY + height * 0.31,
    x + height * 0.034, base - height * 0.35, x + height * 0.049, base);
  ctx.closePath();
  ctx.fill();

  for (const [tipX, tipY, arch] of PALM_FRONDS) {
    const dx = tipX * height;
    const dy = tipY * height;
    const rise = arch * height;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.bezierCurveTo(crownX + dx * 0.27, crownY + dy * 0.12 - rise,
      crownX + dx * 0.77, crownY + dy * 0.42 - rise, crownX + dx, crownY + dy);
    ctx.bezierCurveTo(crownX + dx * 0.67, crownY + dy * 0.56 - rise * 0.38,
      crownX + dx * 0.29, crownY + dy * 0.24 - rise * 0.38, crownX, crownY + height * 0.028);
    ctx.closePath();
    ctx.fill();
  }
}

function drawSkyline(ctx, W, bottom, unit, palette) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, bottom);
  ctx.clip();
  ctx.globalAlpha = 0.55;
  drawPalm(ctx, W * 0.129, bottom, 67 * unit, -0.16, palette.silhouette);
  drawPalm(ctx, W * 0.867, bottom, 60 * unit, 0.19, palette.silhouette);
  ctx.globalAlpha = 1;
  drawPalm(ctx, W * 0.036, bottom, 133 * unit, 0.22, palette.silhouette);
  drawPalm(ctx, W * 0.093, bottom, 90 * unit, -0.11, palette.silhouette);
  drawPalm(ctx, W * 0.965, bottom, 152 * unit, -0.26, palette.silhouette);
  drawPalm(ctx, W * 0.917, bottom, 95 * unit, 0.14, palette.silhouette);
  ctx.restore();
}

function drawPlaceholder(ctx, box, palette, index, fullBleed) {
  const size = Math.min(box.w, box.h);
  // The full-bleed placeholder already has its sky and sun from the background pass.
  if (!fullBleed) {
    ctx.globalAlpha = 0.58;
    paintSky(ctx, box, palette);
    ctx.globalAlpha = 0.86;
    const sunX = index === 1 ? 0.69 : 0.32;
    drawSlicedSun(ctx, box.x + box.w * sunX, box.y + box.h * 0.32, size * 0.155, palette);
    ctx.globalAlpha = 1;
  }

  const base = box.y + box.h * (fullBleed ? 0.74 : 1);
  drawPalm(ctx, box.x + box.w * 0.18, base, size * 0.28, 0.21, palette.silhouette);
  drawPalm(ctx, box.x + box.w * 0.76, base, size * 0.36, -0.25, palette.silhouette);
  drawPalm(ctx, box.x + box.w * 0.89, base, size * 0.21, 0.12, palette.silhouette);
}

function imageSize(img) {
  if (!img || img.complete === false) return null;
  const width = img.naturalWidth ?? img.width;
  const height = img.naturalHeight ?? img.height;
  return width > 0 && height > 0 ? { width, height } : null;
}

function renderInk(img, width, height, ownerDocument) {
  const layer = typeof OffscreenCanvas === 'function'
    ? new OffscreenCanvas(width, height)
    : ownerDocument.createElement('canvas');
  if (layer.width !== width) layer.width = width;
  if (layer.height !== height) layer.height = height;

  const ctx = layer.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, width, height);
  let pixels;
  try {
    pixels = ctx.getImageData(0, 0, width, height);
  } catch (error) {
    if (error.name === 'SecurityError') return img;
    throw error;
  }

  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / 51) * 51;
    data[i + 1] = Math.round(data[i + 1] / 51) * 51;
    data[i + 2] = Math.round(data[i + 2] / 51) * 51;
  }
  ctx.putImageData(pixels, 0, 0);

  const step = Math.max(4, Math.round(Math.max(width, height) / 180));
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(20, 10, 28, 0.30)';
  ctx.beginPath();
  for (let y = 0, row = 0; y < height; y += step, row++) {
    for (let x = row % 2 ? Math.floor(step / 2) : 0; x < width; x += step) {
      const i = 4 * (y * width + x);
      if (!data[i + 3]) continue;
      const light = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
      const radius = step * (0.09 + 0.31 * (1 - light));
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, TAU);
    }
  }
  ctx.fill();
  return layer;
}

function panelSource(img, width, height, ink, ownerDocument) {
  if (!ink) return img;
  const source = img.currentSrc || img.src;
  const cached = inkCache.get(img);
  if (cached?.ink === ink && cached.width === width && cached.height === height && cached.source === source) {
    return cached.drawable;
  }
  const drawable = renderInk(img, width, height, ownerDocument);
  inkCache.set(img, { ink, width, height, source, drawable });
  return drawable;
}

function drawPanel(ctx, box, panel, size, palette, unit, index, fullBleed, ownerDocument) {
  const radius = 4 * unit;
  ctx.save();
  ctx.beginPath();
  roundedPath(ctx, box, radius);
  ctx.clip();

  if (size) {
    const { img, scale, ox, oy, fit, ink } = panel;
    const { width, height } = size;
    const source = panelSource(img, width, height, Boolean(ink), ownerDocument);
    const { dw, dh, dx, dy } = coverTransform(width, height, box.w, box.h, scale, ox, oy, fit);
    ctx.fillStyle = palette.skyBot;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.drawImage(source, box.x + dx, box.y + dy, dw, dh);
    ctx.fillStyle = palette.gradeOverlay;
    ctx.fillRect(box.x + dx, box.y + dy, dw, dh);
  } else {
    drawPlaceholder(ctx, box, palette, index, fullBleed);
  }

  ctx.restore();

  const inset = 2.5 * unit;
  ctx.beginPath();
  roundedPath(ctx, insetRect(box, inset), radius - inset);
  ctx.lineWidth = 5 * unit;
  ctx.strokeStyle = palette.silhouette;
  ctx.stroke();
  ctx.lineWidth = 3 * unit;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
}

function font(size) {
  return `${size}px ${FONT_STACK}`;
}

function titleWidth(ctx, text) {
  const metrics = ctx.measureText(text);
  return Math.max(metrics.width, 2 * (metrics.actualBoundingBoxLeft || 0),
    2 * (metrics.actualBoundingBoxRight || 0));
}

function wrapTitle(ctx, words, width) {
  const single = words.join(' ');
  const singleWidth = titleWidth(ctx, single);
  if (singleWidth <= width || words.length < 2) {
    return { lines: [single], width: singleWidth };
  }

  let best = { lines: [single], width: singleWidth };
  for (let split = 1; split < words.length; split++) {
    const first = words.slice(0, split).join(' ');
    const second = words.slice(split).join(' ');
    const lineWidth = Math.max(titleWidth(ctx, first), titleWidth(ctx, second));
    if (lineWidth < best.width) best = { lines: [first, second], width: lineWidth };
  }
  return best;
}

function fitTitle(ctx, text, width, height) {
  const words = text.split(' ');
  const minimum = 12;
  let size = Math.max(minimum, height * 0.93);
  while (true) {
    ctx.font = font(size);
    const wrapped = wrapTitle(ctx, words, Math.max(1, width - size * 0.24));
    const metrics = wrapped.lines.map(line => ctx.measureText(line));
    const ascent = Math.max(...metrics.map(m => m.actualBoundingBoxAscent ?? size * 0.72));
    const descent = Math.max(0, ...metrics.map(m => m.actualBoundingBoxDescent ?? size * 0.15));
    const leading = Math.max(size * 0.89, ascent + descent + size * 0.045);
    const blockHeight = ascent + descent + leading * (wrapped.lines.length - 1);
    if ((wrapped.width + size * 0.24 <= width && blockHeight + size * 0.18 <= height) || size === minimum) {
      return { ...wrapped, size, ascent, leading, blockHeight };
    }
    size = Math.max(minimum, size * 0.96);
  }
}

function drawTitle(ctx, text, box, palette, style) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  const fitted = fitTitle(ctx, text, box.w, box.h);
  const { size, leading, ascent, blockHeight, lines } = fitted;
  const width = Math.max(1, box.w - size * 0.24);
  ctx.translate(box.x + box.w / 2, box.y + (box.h - blockHeight) / 2 + ascent);
  ctx.scale(Math.min(1, width / Math.max(1, fitted.width)), 1);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const y = i * leading;
    if (style === 'outline') {
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = size / 11;
      ctx.strokeText(line, 0, y);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = Math.max(0.8, size / 42);
      ctx.strokeText(line, 0, y);
    } else {
      const offset = size / 18;
      ctx.lineWidth = size / 14;
      ctx.strokeStyle = palette.accent;
      ctx.fillStyle = palette.accent;
      ctx.strokeText(line, offset, y + offset);
      ctx.fillText(line, offset, y + offset);
      ctx.strokeStyle = palette.silhouette;
      ctx.strokeText(line, 0, y);
      ctx.fillStyle = '#fff';
      ctx.fillText(line, 0, y);
    }
  }
  ctx.restore();
}

function spacedText(ctx, text, x, y, spacing, maxWidth) {
  const letters = Array.from(text);
  if (!letters.length) return;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const widths = letters.map(letter => ctx.measureText(letter).width);
  const width = widths.reduce((sum, advance) => sum + advance, 0) + spacing * (letters.length - 1);
  ctx.translate(x, y);
  ctx.scale(Math.min(1, maxWidth / Math.max(1, width)), 1);
  let cursor = -width / 2;
  for (let i = 0; i < letters.length; i++) {
    ctx.fillText(letters[i], cursor, 0);
    cursor += widths[i] + spacing;
  }
  ctx.restore();
}

function drawTitleBand(ctx, band, tag, state, palette, unit) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(band.x, band.y, band.w, band.h);
  ctx.clip();
  ctx.fillStyle = palette.band;
  ctx.fillRect(band.x, band.y, band.w, band.h);

  const foot = band.y + band.h;
  const palmHeight = Math.min(119 * unit, band.h * 0.60);
  ctx.globalAlpha = 0.66;
  drawPalm(ctx, band.w * 0.049, foot, palmHeight, 0.24, palette.silhouette);
  drawPalm(ctx, band.w * 0.965, foot, palmHeight * 1.1, -0.23, palette.silhouette);
  ctx.globalAlpha = 1;

  ctx.fillStyle = palette.accent;
  ctx.fillRect(band.x, band.y, band.w, 4 * unit);
  ctx.beginPath();
  roundedPath(ctx, tag, tag.h / 2);
  ctx.fill();
  ctx.fillStyle = palette.silhouette;
  ctx.font = font(tag.h * 0.53);
  spacedText(ctx, 'VICE CITY', tag.x + tag.w / 2, tag.y + tag.h * 0.52, 1.6 * unit, tag.w - 12 * unit);

  const title = String(state.title ?? '').trim().replace(/\s+/g, ' ');
  const subtitle = String(state.subtitle ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
  const subtitleSize = Math.min(26 * unit, band.h * 0.112);
  const subtitleSpace = subtitle ? subtitleSize * 1.44 : 0;
  const padY = band.h * 0.115;
  const padX = band.w - tag.x + 12 * unit;

  if (title) {
    const textBox = rect(padX, band.y + padY, band.w - 2 * padX, band.h - 2 * padY - subtitleSpace);
    drawTitle(ctx, title, textBox, palette, state.titleStyle);
  }
  if (subtitle) {
    ctx.font = font(subtitleSize);
    ctx.fillStyle = palette.bandText;
    const y = title ? foot - padY - subtitleSize * 0.41 : band.y + band.h / 2;
    spacedText(ctx, subtitle, band.w / 2, y, subtitleSize * 0.21, band.w - 2 * padX);
  }
  ctx.restore();
}

function drawSkyHalftone(ctx, W, bottom, boxes, sizes, palette, unit) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, bottom);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(0, 0, W, Math.max(bottom, ...boxes.map(box => box.y + box.h)));
  boxes.forEach((box, index) => {
    if (sizes[index]) roundedPath(ctx, box, 4 * unit);
  });
  ctx.clip('evenodd');

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = palette.halftone;
  ctx.beginPath();
  const step = 16 * unit;
  for (let y = step / 2, row = 0; y < bottom; y += step, row++) {
    const radius = unit * (0.55 + 2.85 * (y / bottom) ** 1.7);
    for (let x = row % 2 ? 0 : step / 2; x < W; x += step) {
      ctx.moveTo(x + radius, y);
      ctx.arc(x, y, radius, 0, TAU);
    }
  }
  ctx.fill();
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(W / 2, H / 2);
  const shade = ctx.createRadialGradient(0, 0, 0.40, 0, 0, 1.42);
  shade.addColorStop(0, 'rgba(10, 4, 15, 0)');
  shade.addColorStop(0.56, 'rgba(10, 4, 15, 0.10)');
  shade.addColorStop(1, 'rgba(10, 4, 15, 0.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function drawGrain(ctx, W, H) {
  const random = mulberry32(1337);
  const count = Math.round(W * H / 900);
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < count; i++) {
    const x = Math.floor(random() * W);
    const y = Math.floor(random() * H);
    ctx.fillStyle = random() < 0.5 ? '#fff' : '#000';
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}

function drawHighlight(ctx, box, index, palette, unit) {
  ctx.save();
  ctx.strokeStyle = palette.accent2;
  ctx.lineWidth = 3 * unit;
  ctx.setLineDash([10 * unit, 6 * unit]);
  ctx.beginPath();
  roundedPath(ctx, insetRect(box, 2 * unit), 4 * unit);
  ctx.stroke();

  const chip = rect(box.x + 10 * unit, box.y + 10 * unit, 86 * unit, 27 * unit);
  ctx.fillStyle = palette.accent2;
  ctx.beginPath();
  roundedPath(ctx, chip, 5 * unit);
  ctx.fill();
  ctx.fillStyle = palette.silhouette;
  ctx.font = font(16 * unit);
  spacedText(ctx, `PANEL ${index + 1}`, chip.x + chip.w / 2, chip.y + chip.h * 0.52, unit, chip.w - 8 * unit);
  ctx.restore();
}

export function drawCover(canvas, state, W, H, opts = {}) {
  if (!(W > 0 && H > 0)) return;

  // Set the backing store (resizing clears the canvas); re-assert width after
  // height so both dimensions end up exactly as requested.
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  if (canvas.width !== W) canvas.width = W;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const unit = W / 1080;
  const layout = Object.hasOwn(LAYOUTS, state.layout) ? state.layout : 'vice';
  const palette = Object.hasOwn(PALETTES, state.grade) ? PALETTES[state.grade] : PALETTES.sunset;
  const { panels, title, tag } = layoutPanels(layout, W, H);
  const visible = box => box.w > 0 && box.h > 0;
  const sizes = panels.map((box, index) => visible(box) ? imageSize(state.panels?.[index]?.img) : null);

  paintSky(ctx, rect(0, 0, W, H), palette);
  // In the vice layout a strip of sky shows between the photo area and the
  // title band: put the sliced sun there so it is actually visible.
  const sunInStrip = layout === 'vice';
  const sunX = sunInStrip ? W * 0.5 : W * 0.52;
  const sunY = sunInStrip ? H * 0.70 : H * 0.36;
  const sunR = sunInStrip ? Math.min(W, H) * 0.13 : Math.min(W, H) * 0.32;
  drawSlicedSun(ctx, sunX, sunY, sunR, palette);

  panels.forEach((box, index) => {
    if (visible(box)) {
      drawPanel(ctx, box, state.panels?.[index], sizes[index], palette, unit,
        index, layout === 'poster', canvas.ownerDocument);
    }
  });

  drawSkyline(ctx, W, title.y, unit, palette);
  drawTitleBand(ctx, title, tag, state, palette, unit);
  drawSkyHalftone(ctx, W, title.y, panels, sizes, palette, unit);
  drawVignette(ctx, W, H);
  drawGrain(ctx, W, H);

  const index = opts.highlight;
  if (opts.preview && Number.isInteger(index) && panels[index] && visible(panels[index])) {
    drawHighlight(ctx, panels[index], index, palette, unit);
  }
}
