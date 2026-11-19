// Screenshot staging for Vice Cover Studio (?shot=cover|editor).
// Runs after main.js: reads the query, stages a scene (sample photo,
// caption, layout, grade, size), repaints, then sets window.__shotReady
// so a screenshot script knows the frame is settled. In cover mode the
// editor chrome is hidden so the frame is the exported cover itself.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');

async function stage() {
  if (!shot) return;
  const vcs = window.__vcs;
  if (!vcs) return;
  await vcs.ready;

  const state = vcs.state;
  const layout = params.get('layout');
  if (layout && ['vice', 'poster', 'triptych', 'strip'].includes(layout)) {
    state.layout = layout;
    const sel = document.querySelector('#layoutSel');
    if (sel) sel.value = layout;
  }
  const grade = params.get('grade');
  if (grade && ['sunset', 'neon', 'golden', 'noir'].includes(grade)) state.grade = grade;
  const size = params.get('size');
  if (size && ['square', 'portrait', 'wide'].includes(size)) state.size = size;
  const caption = params.get('caption');
  if (caption) {
    state.title = caption;
    const titleInput = document.querySelector('#titleInput');
    if (titleInput) titleInput.value = caption;
  }
  const subtitle = params.get('subtitle');
  if (subtitle) {
    state.subtitle = subtitle;
    const subInput = document.querySelector('#subtitleInput');
    if (subInput) subInput.value = subtitle;
  }

  const photo = params.get('photo') || 'pier';
  await vcs.loadSample(photo, 0);
  state.panels[0].photoIdx = 0;
  state.panels[1].photoIdx = 0;
  state.panels[2].photoIdx = 0;

  if (shot === 'editor') {
    // A second, different photo makes the editor shot show multi-photo work.
    const other = photo === 'pier' ? 'boulevard' : 'pier';
    await vcs.loadSample(other, 1);
    state.panels[1].photoIdx = 1;
    state.panels[2].photoIdx = 1;
  }

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const canvas = document.querySelector('#coverCanvas');
    if (canvas) {
      canvas.style.maxWidth = '100vw';
      canvas.style.maxHeight = '100vh';
    }
  }

  try {
    await document.fonts.load('40px "Bebas Neue"');
    await document.fonts.ready;
  } catch {
    // Fallback lettering still paints; the shot is usable either way.
  }
  // Cover shots show the exported cover exactly: no selection highlight.
  vcs.repaint(shot === 'cover' ? { preview: false } : {});
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

stage().catch(error => {
  console.error('shot staging failed', error);
  window.__shotReady = true;
});
