import { LAYOUTS, GRADES, SIZES, layoutPanels, drawCover, clampPan } from './cover.js';

const CAPTION_PRESETS = [
  { title: 'PICK ME, JUDGE', subtitle: 'YOUR NEXT WINNER' },
  { title: 'VICE CITY', subtitle: 'NEVER SLEEPS' },
  { title: 'SUNSET HEIST', subtitle: 'ONE LAST JOB' },
  { title: 'NEON SHORE', subtitle: 'AFTER MIDNIGHT' },
  { title: 'GOLDEN HOUR', subtitle: 'RUN THE COAST' }
];

function defaultPanels() {
  return [0, 1, 2].map(photoIdx => ({
    photoIdx, scale: 1, ox: 0, oy: 0, fit: 'fill', ink: false
  }));
}

const state = {
  layout: 'vice', grade: 'sunset', size: 'square',
  title: 'PICK ME, JUDGE', subtitle: 'YOUR NEXT WINNER',
  titleStyle: 'solid', selected: 0,
  photos: [null, null, null], panels: defaultPanels()
};

const ui = Object.fromEntries([
  'coverCanvas', 'oneClickBtn', 'resetBtn', 'samplePierBtn', 'sampleBlvdBtn',
  'autoDistBtn', 'fitFillBtn', 'inkBtn', 'exportBtn', 'layoutSel',
  'titleStyleSel', 'panelPhotoSel', 'titleInput', 'subtitleInput', 'zoomRange',
  'slots', 'gradeRow', 'presetRow', 'sizeRow', 'selectedLabel', 'zoomVal',
  'statusLine', 'previewSizeLabel'
].map(id => [id, document.getElementById(id)]));

const canvas = ui.coverCanvas;
const canvasWrap = canvas.closest('.canvas-wrap');
const slotNames = ['', '', ''];
const pendingLoads = new Map();
const gradeGradients = {
  sunset: 'linear-gradient(135deg,#ff2e88,#ff7a18,#2b0a4a)',
  neon: 'linear-gradient(135deg,#360951,#ff00a8,#00e5ff)',
  golden: 'linear-gradient(135deg,#ff5e3a,#ffb347,#3a1503)',
  noir: 'linear-gradient(135deg,#55504d,#bfb5aa,#ff4d6d)'
};

let loadingCount = 0;
let exporting = false;
let oneClickRunning = false;
let fontsLoaded = false;
let resetVersion = 0;
let drag = null;
window.__shotReady = false;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const setStatus = message => { ui.statusLine.textContent = message; };

function element(tag, className = '', text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function collectionEntries(collection) {
  return Array.isArray(collection)
    ? collection.map(value => [
      typeof value === 'string' ? value : value.id ?? value.key ?? value.value,
      value
    ])
    : Object.entries(collection);
}

function entryName(key, value) {
  return typeof value === 'string'
    ? value
    : value.name ?? value.label ?? `${key[0].toUpperCase()}${key.slice(1)}`;
}

function dimensions(sizeKey = state.size) {
  const size = SIZES[sizeKey];
  if (!size) throw new Error(`Unknown size: ${sizeKey}`);
  return { w: size.w ?? size.width ?? size[0], h: size.h ?? size.height ?? size[1] };
}

function coverState() {
  return {
    ...state,
    panels: state.panels.map(panel => ({
      img: state.photos[panel.photoIdx] || null,
      scale: panel.scale, ox: panel.ox, oy: panel.oy,
      fit: panel.fit, ink: panel.ink
    }))
  };
}

function panelRects() {
  const { w, h } = dimensions();
  return layoutPanels(state.layout, w, h).panels;
}

function clampPanel(panel, rect) {
  const image = state.photos[panel.photoIdx];
  if (!image || !rect || rect.w <= 0 || rect.h <= 0) return;
  const pan = clampPan(
    image.naturalWidth, image.naturalHeight, rect.w, rect.h,
    panel.scale, panel.ox, panel.oy, panel.fit
  );
  panel.ox = pan.ox;
  panel.oy = pan.oy;
}

function canvasPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * canvas.width / bounds.width,
    y: (event.clientY - bounds.top) * canvas.height / bounds.height
  };
}

function hitPanel(point) {
  const rects = panelRects();
  const index = rects.findIndex(rect => rect.w > 0 && rect.h > 0
    && point.x >= rect.x && point.x < rect.x + rect.w
    && point.y >= rect.y && point.y < rect.y + rect.h);
  return index < 0 ? null : { index, rect: rects[index] };
}

function renderChoices() {
  ui.layoutSel.replaceChildren(...collectionEntries(LAYOUTS).map(([key, value]) => {
    const option = element('option', '', entryName(key, value));
    option.value = key;
    return option;
  }));
  ui.panelPhotoSel.replaceChildren(...[0, 1, 2].map(index => {
    const option = element('option', '', `Photo ${index + 1}`);
    option.value = String(index);
    return option;
  }));
  ui.gradeRow.replaceChildren(...collectionEntries(GRADES).map(([key, value]) => {
    const button = element('button', 'grade-btn');
    button.type = 'button';
    button.dataset.grade = key;
    const swatch = element('span', 'swatch');
    swatch.style.background = gradeGradients[key] || gradeGradients.sunset;
    swatch.setAttribute('aria-hidden', 'true');
    button.append(swatch, element('span', 'gname', entryName(key, value)));
    button.addEventListener('click', () => { state.grade = key; repaint(); });
    return button;
  }));
  ui.presetRow.replaceChildren(...CAPTION_PRESETS.map(({ title, subtitle }) => {
    const button = element('button', 'btn btn-small preset-btn', title);
    button.type = 'button';
    button.title = `${title} — ${subtitle}`;
    button.addEventListener('click', () => setCaption(title, subtitle));
    return button;
  }));
}

function renderSlots() {
  ui.slots.replaceChildren(...state.photos.map((photo, index) => {
    const row = element('div', 'slot');
    const thumbnail = photo
      ? element('img', 'slot-thumb')
      : element('div', 'slot-thumb is-empty', 'No photo');
    if (photo) {
      thumbnail.src = photo.src;
      thumbnail.alt = slotNames[index] || `Photo ${index + 1}`;
    }
    const pending = pendingLoads.get(index);
    const meta = element('div', 'slot-meta');
    meta.append(
      element('strong', 'slot-name', `Photo ${index + 1}`),
      element('span', 'slot-state', pending ? `Loading ${pending.label}…`
        : slotNames[index] || 'Empty — upload or use a sample')
    );
    const label = element('label', 'btn btn-small', 'Upload photo');
    const input = element('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    input.setAttribute('aria-label', `Upload photo ${index + 1}`);
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) void loadPhoto(index, file, file.name);
    });
    label.append(input);
    row.append(thumbnail, meta, label);
    return row;
  }));
}

function syncExportButton() {
  ui.exportBtn.disabled = loadingCount > 0 || exporting;
  ui.oneClickBtn.disabled = oneClickRunning || exporting;
}

function syncPanelControls() {
  const panel = state.panels[state.selected];
  const photo = state.photos[panel.photoIdx];
  ui.panelPhotoSel.value = String(panel.photoIdx);
  ui.zoomRange.value = String(Math.round(panel.scale * 100));
  ui.zoomVal.textContent = `${Math.round(panel.scale * 100)}%`;
  ui.fitFillBtn.textContent = `Fit / Fill: ${panel.fit === 'fill' ? 'Fill' : 'Fit'}`;
  ui.inkBtn.textContent = `Ink: ${panel.ink ? 'On' : 'Off'}`;
  ui.inkBtn.setAttribute('aria-pressed', String(panel.ink));
  ui.selectedLabel.textContent =
    `Panel ${state.selected + 1} selected — photo ${panel.photoIdx + 1}`
    + `${photo ? '' : ' (empty)'}. Drag to pan, scroll to zoom.`;
}

function syncControls() {
  ui.layoutSel.value = state.layout;
  ui.titleStyleSel.value = state.titleStyle;
  ui.titleInput.value = state.title;
  ui.subtitleInput.value = state.subtitle;
  for (const button of ui.gradeRow.querySelectorAll('[data-grade]')) {
    const active = button.dataset.grade === state.grade;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  for (const button of ui.sizeRow.querySelectorAll('.size-btn[data-size]')) {
    const active = button.dataset.size === state.size;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  syncPanelControls();
  syncExportButton();
}

function repaint(options = {}) {
  syncControls();
  const { w, h } = dimensions();
  ui.previewSizeLabel.textContent = `${w} × ${h}`;
  if (canvasWrap) canvasWrap.style.aspectRatio = `${w} / ${h}`;
  if (!fontsLoaded) return;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  // Screenshots of the exported cover pass {preview:false}: no selection
  // highlight, exactly what exportPNG draws.
  const preview = options.preview !== false;
  drawCover(canvas, coverState(), w, h,
    { preview, highlight: preview ? state.selected : null });
}

function loadPhoto(index, source, label) {
  pendingLoads.get(index)?.cancel();
  return new Promise(resolve => {
    const image = new Image();
    let reader = null;
    let settled = false;
    const finish = (loadedImage, error = '') => {
      if (settled) return;
      settled = true;
      image.onload = image.onerror = null;
      if (reader) reader.onload = reader.onerror = reader.onabort = null;
      if (pendingLoads.get(index) === task) pendingLoads.delete(index);
      loadingCount = Math.max(0, loadingCount - 1);
      if (loadedImage) {
        state.photos[index] = loadedImage;
        slotNames[index] = label;
      }
      renderSlots();
      syncExportButton();
      repaint();
      if (error) setStatus(error);
      else if (loadedImage) setStatus(`Loaded ${label} into photo ${index + 1}.`);
      resolve(loadedImage);
    };
    const task = {
      label,
      cancel() {
        finish(null);
        if (reader && reader.readyState === FileReader.LOADING) reader.abort();
        image.removeAttribute('src');
      }
    };
    pendingLoads.set(index, task);
    loadingCount += 1;
    syncExportButton();
    renderSlots();
    setStatus(`Loading ${label}…`);
    image.onload = () => {
      if (image.naturalWidth && image.naturalHeight) finish(image);
      else finish(null, `Could not load ${label}: the image is empty.`);
    };
    image.onerror = () => finish(null, `Could not load ${label}. Try another image.`);
    try {
      if (typeof source === 'string') {
        image.src = source;
      } else {
        reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') image.src = reader.result;
          else finish(null, `Could not read ${label}.`);
        };
        reader.onerror = () => finish(null, `Could not read ${label}.`);
        reader.onabort = () => finish(null, `Loading ${label} was cancelled.`);
        reader.readAsDataURL(source);
      }
    } catch {
      finish(null, `Could not load ${label}. Try another image.`);
    }
  });
}

function loadSample(name, index = 0) {
  const samples = {
    pier: { src: 'samples/pier.jpg', label: 'Sample: Pier' },
    boulevard: { src: 'samples/boulevard.jpg', label: 'Sample: Boulevard' }
  };
  const sample = samples[name];
  if (!sample) {
    setStatus(`Unknown sample: ${name}.`);
    return Promise.resolve(null);
  }
  return loadPhoto(index, sample.src, sample.label);
}

function setCaption(title, subtitle) {
  state.title = String(title ?? '');
  state.subtitle = String(subtitle ?? '');
  repaint();
}

function anchorZoom(panel, rect, anchorX, anchorY, newScale) {
  const image = state.photos[panel.photoIdx];
  newScale = clamp(newScale, 0.5, 3);
  if (!image || !rect || rect.w <= 0 || rect.h <= 0) {
    panel.scale = newScale;
    return;
  }
  const base = (panel.fit === 'fit' ? Math.min : Math.max)(
    rect.w / image.naturalWidth, rect.h / image.naturalHeight
  );
  const oldW = image.naturalWidth * base * panel.scale;
  const oldH = image.naturalHeight * base * panel.scale;
  // Preserve the image fraction under the pointer before applying crop limits.
  const imageX = (anchorX - (rect.w - oldW) / 2 - panel.ox * rect.w) / oldW;
  const imageY = (anchorY - (rect.h - oldH) / 2 - panel.oy * rect.h) / oldH;
  const newW = image.naturalWidth * base * newScale;
  const newH = image.naturalHeight * base * newScale;
  panel.scale = newScale;
  panel.ox = (anchorX - (rect.w - newW) / 2 - imageX * newW) / rect.w;
  panel.oy = (anchorY - (rect.h - newH) / 2 - imageY * newH) / rect.h;
  clampPanel(panel, rect);
}

canvas.tabIndex = 0;
canvas.style.touchAction = 'none';
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || drag) return;
  const point = canvasPoint(event);
  const hit = hitPanel(point);
  if (!hit) return;
  event.preventDefault();
  state.selected = hit.index;
  canvas.focus({ preventScroll: true });
  repaint();
  if (!state.photos[state.panels[hit.index].photoIdx]) return;
  drag = { pointerId: event.pointerId, index: hit.index, x: point.x, y: point.y };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const point = canvasPoint(event);
  const rect = panelRects()[drag.index];
  const panel = state.panels[drag.index];
  if (rect?.w > 0 && rect.h > 0 && state.photos[panel.photoIdx]) {
    panel.ox += (point.x - drag.x) / rect.w;
    panel.oy += (point.y - drag.y) / rect.h;
    clampPanel(panel, rect);
    repaint();
  }
  drag.x = point.x;
  drag.y = point.y;
});

function endDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  drag = null;
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('lostpointercapture', endDrag);

canvas.addEventListener('wheel', event => {
  const point = canvasPoint(event);
  const hit = hitPanel(point);
  if (!hit) return;
  const panel = state.panels[hit.index];
  if (!state.photos[panel.photoIdx]) return;
  event.preventDefault();
  state.selected = hit.index;
  anchorZoom(panel, hit.rect, point.x - hit.rect.x, point.y - hit.rect.y,
    panel.scale * Math.exp(-event.deltaY * 0.0012));
  repaint();
}, { passive: false });

canvas.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^[123]$/.test(event.key)) {
    state.selected = Number(event.key) - 1;
    repaint();
    return;
  }
  const arrows = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    ArrowUp: [0, -1], ArrowDown: [0, 1]
  };
  const direction = arrows[event.key];
  const zoomIn = event.key === '+' || event.key === '=';
  const zoomOut = event.key === '-';
  if (!direction && !zoomIn && !zoomOut) return;
  event.preventDefault();
  const panel = state.panels[state.selected];
  const rect = panelRects()[state.selected];
  if (!state.photos[panel.photoIdx] || !rect || rect.w <= 0 || rect.h <= 0) return;
  if (direction) {
    const step = event.shiftKey ? 0.08 : 0.02;
    panel.ox += direction[0] * step;
    panel.oy += direction[1] * step;
    clampPanel(panel, rect);
  } else {
    anchorZoom(panel, rect, rect.w / 2, rect.h / 2,
      zoomIn ? panel.scale * 1.1 : panel.scale / 1.1);
  }
  repaint();
});

async function exportPNG(sizeKey, { download = true } = {}) {
  if (exporting) return null;
  if (loadingCount > 0) {
    setStatus('Still loading photos…');
    return null;
  }
  exporting = true;
  syncExportButton();
  try {
    await ready;
    if (loadingCount > 0) {
      setStatus('Still loading photos…');
      return null;
    }
    setStatus('Rendering PNG…');
    const { w, h } = dimensions(sizeKey);
    const offCanvas = document.createElement('canvas');
    offCanvas.width = w;
    offCanvas.height = h;
    const started = performance.now();
    drawCover(offCanvas, coverState(), w, h, { preview: false });
    const blob = await new Promise((resolve, reject) => {
      offCanvas.toBlob(result => {
        if (result) resolve(result);
        else reject(new Error('The browser could not create a PNG.'));
      }, 'image/png');
    });
    const pngBytes = new Uint8Array(await blob.arrayBuffer());
    let hashValue = 0x811c9dc5;
    for (const byte of pngBytes) hashValue = Math.imul(hashValue ^ byte, 0x01000193);
    const hash = (hashValue >>> 0).toString(16).padStart(8, '0');
    const ms = Math.round(performance.now() - started);
    const bytes = blob.size;
    window.__lastExport = { size: sizeKey, w, h, ms, bytes, hash };
    if (download) {
      const url = URL.createObjectURL(blob);
      const link = element('a');
      link.href = url;
      link.download = `vice-cover-${sizeKey}-${w}x${h}.png`;
      link.hidden = true;
      document.body.append(link);
      try {
        link.click();
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    }
    setStatus(`Exported ${w}×${h} PNG in ${ms} ms (${bytes} bytes).`);
    return { w, h, ms, bytes, hash, blob };
  } catch (error) {
    setStatus(`Export failed: ${error.message || 'Please try again.'}`);
    return null;
  } finally {
    exporting = false;
    syncExportButton();
  }
}

async function oneClickCover() {
  if (oneClickRunning || exporting) return;
  oneClickRunning = true;
  const version = resetVersion;
  syncExportButton();
  try {
    setStatus('Preparing your square cover…');
    if (!state.photos.some(Boolean)) void loadSample('pier');
    const started = performance.now();
    while (loadingCount > 0 && performance.now() - started < 5000) {
      setStatus('Loading photos for your cover…');
      await new Promise(resolve => setTimeout(resolve, 40));
      if (version !== resetVersion) return;
    }
    if (version !== resetVersion) return;
    if (loadingCount > 0) { setStatus('Still loading photos…'); return; }
    if (!state.photos.some(Boolean)) {
      setStatus('No photo could be loaded. Try uploading a photo.');
      return;
    }
    await exportPNG('square');
  } finally {
    oneClickRunning = false;
    syncExportButton();
  }
}

async function distributePhotos() {
  const version = resetVersion;
  const loadedIndices = () => state.photos.flatMap((photo, index) => photo ? [index] : []);
  let loaded = loadedIndices();
  if (!loaded.length) {
    await loadSample('pier');
    if (version !== resetVersion) return;
    loaded = loadedIndices();
  }
  if (!loaded.length) return;
  const rects = panelRects();
  state.panels.forEach((panel, index) => {
    panel.photoIdx = loaded[index % loaded.length];
    clampPanel(panel, rects[index]);
  });
  repaint();
  setStatus('Photos distributed across all three panels.');
}

function reset() {
  resetVersion += 1;
  drag = null;
  for (const task of [...pendingLoads.values()]) task.cancel();
  pendingLoads.clear();
  loadingCount = 0;
  Object.assign(state, {
    layout: 'vice', grade: 'sunset', size: 'square',
    title: 'PICK ME, JUDGE', subtitle: 'YOUR NEXT WINNER',
    titleStyle: 'solid', selected: 0,
    photos: [null, null, null], panels: defaultPanels()
  });
  slotNames.fill('');
  renderSlots();
  repaint();
  setStatus('Reset — fresh canvas.');
}

for (const [id, field] of [['layoutSel', 'layout'], ['titleStyleSel', 'titleStyle']]) {
  ui[id].addEventListener('change', event => {
    state[field] = event.currentTarget.value;
    repaint();
  });
}
for (const [id, field] of [['titleInput', 'title'], ['subtitleInput', 'subtitle']]) {
  ui[id].addEventListener('input', event => {
    state[field] = event.currentTarget.value;
    repaint();
  });
}
for (const button of ui.sizeRow.querySelectorAll('.size-btn[data-size]')) {
  button.addEventListener('click', () => {
    state.size = button.dataset.size;
    repaint();
  });
}
ui.panelPhotoSel.addEventListener('change', () => {
  const panel = state.panels[state.selected];
  panel.photoIdx = Number(ui.panelPhotoSel.value);
  clampPanel(panel, panelRects()[state.selected]);
  repaint();
});
ui.zoomRange.addEventListener('input', () => {
  const panel = state.panels[state.selected];
  panel.scale = clamp(Number(ui.zoomRange.value) / 100, 0.5, 3);
  clampPanel(panel, panelRects()[state.selected]);
  repaint();
});
ui.fitFillBtn.addEventListener('click', () => {
  const panel = state.panels[state.selected];
  panel.fit = panel.fit === 'fill' ? 'fit' : 'fill';
  clampPanel(panel, panelRects()[state.selected]);
  repaint();
});
ui.inkBtn.addEventListener('click', () => {
  state.panels[state.selected].ink = !state.panels[state.selected].ink;
  repaint();
});
for (const [id, name] of [['samplePierBtn', 'pier'], ['sampleBlvdBtn', 'boulevard']]) {
  ui[id].addEventListener('click', () => {
    const empty = state.photos.findIndex(photo => !photo);
    void loadSample(name, empty < 0 ? 0 : empty);
  });
}
ui.autoDistBtn.addEventListener('click', distributePhotos);
ui.oneClickBtn.addEventListener('click', oneClickCover);
ui.resetBtn.addEventListener('click', reset);
ui.exportBtn.addEventListener('click', () => { void exportPNG(state.size); });

const shotMode = new URLSearchParams(window.location.search).has('shot');
renderChoices();
renderSlots();
syncControls();
setStatus(shotMode ? 'Ready for scene setup.' : 'Ready — upload photos or try a sample.');

const ready = (async () => {
  try {
    await document.fonts.load('40px "Bebas Neue"');
  } catch {}
  fontsLoaded = true;
  repaint();
})();

window.__vcs = { state, repaint, exportPNG, loadSample, setCaption, ready };
if (document.fonts) document.fonts.ready.then(() => {
  // Never repaint over a staged cover screenshot.
  if (!document.body.classList.contains('shot-cover')) repaint();
}).catch(() => {});
