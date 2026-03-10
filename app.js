// ─────────────────────────────────────────────
// APP — pure rendering/interaction logic.
// No data here. All content comes from JSON files via loader.js.
// ─────────────────────────────────────────────

// ── Layout constants ──
const NW   = 160;
const NH   = 60;
const HGAP = 200;
const VGAP = 20;
const PAD  = 48;

// ── State ──
let SYSTEMS   = {};
let activeEl  = null;
let currentSys = null;

// ─────────────────────────────────────────────
// LAYOUT
// ─────────────────────────────────────────────
function layoutTree(node, depth, cursor) {
  node._depth = depth;
  node._x = PAD + depth * (NW + HGAP);

  if (!node.children || node.children.length === 0) {
    node._y = cursor;
    node._span = NH + VGAP;
    return node._span;
  }

  let cur = cursor;
  let totalSpan = 0;
  for (const c of node.children) {
    const s = layoutTree(c, depth + 1, cur);
    cur += s;
    totalSpan += s;
  }

  const first = node.children[0];
  const last  = node.children[node.children.length - 1];
  const childrenMidTop    = first._y + NH / 2;
  const childrenMidBottom = last._y  + NH / 2;
  node._y = (childrenMidTop + childrenMidBottom) / 2 - NH / 2;
  node._span = totalSpan;
  return totalSpan;
}

function flattenTree(node, list = []) {
  list.push(node);
  if (node.children) node.children.forEach(c => flattenTree(c, list));
  return list;
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────
function renderSystem(key) {
  currentSys = key;
  const sys   = SYSTEMS[key];
  const stage = document.getElementById('stage');
  const svg   = document.getElementById('edges');

  stage.querySelectorAll('.node').forEach(n => n.remove());
  svg.innerHTML = '';
  activeEl = null;

  layoutTree(sys.tree, 0, PAD);
  const nodes = flattenTree(sys.tree);

  const maxX = Math.max(...nodes.map(n => n._x)) + NW + PAD;
  const maxY = Math.max(...nodes.map(n => n._y)) + NH + PAD;
  stage.style.width  = maxX + 'px';
  stage.style.height = maxY + 'px';
  svg.setAttribute('width',   maxX);
  svg.setAttribute('height',  maxY);

  function drawEdges(node) {
    if (!node.children) return;
    const x1 = node._x + NW;
    const y1 = node._y + NH / 2;
    node.children.forEach(child => {
      const x2 = child._x;
      const y2 = child._y + NH / 2;
      const mx = x1 + (x2 - x1) * 0.5;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
      path.classList.add('edge');
      path.id = `e-${node.id}-${child.id}`;
      svg.appendChild(path);
      drawEdges(child);
    });
  }
  drawEdges(sys.tree);

  nodes.forEach(n => {
    const el = document.createElement('div');
    el.className = 'node' + (n.type === 'root' ? ' root' : n.type === 'category' ? ' category' : '');
    el.id = 'nd-' + n.id;
    el.style.left      = n._x + 'px';
    el.style.top       = n._y + 'px';
    el.style.width     = NW  + 'px';
    el.style.minHeight = NH  + 'px';
    el.innerHTML = `<span class="node-label">${n.label}</span>${n.sub ? `<span class="node-sub">${n.sub}</span>` : ''}`;

    if (n.info) {
      el.addEventListener('click', e => {
        e.stopPropagation();
        openModal(n, el);
      });
    }
    stage.appendChild(el);
  });

  fitScreen(false);
}

// ─────────────────────────────────────────────
// PAN & ZOOM — Mouse + Touch (pinch)
// ─────────────────────────────────────────────
let scale     = 1;
let tx        = 0;
let ty        = 0;
let dragging  = false;
let dragStart = { x: 0, y: 0 };

function applyTransform(anim = false) {
  const stage = document.getElementById('stage');
  stage.style.transition = anim ? 'transform 0.38s cubic-bezier(0.25,0.8,0.25,1)' : 'none';
  stage.style.transform  = `translate(${tx}px,${ty}px) scale(${scale})`;
  document.getElementById('zoomLabel').textContent = Math.round(scale * 100) + '%';
}

function fitScreen(anim = true) {
  const vp   = document.getElementById('viewport');
  const stage= document.getElementById('stage');
  const vw   = vp.clientWidth;
  const vh   = vp.clientHeight;
  const cw   = parseFloat(stage.style.width)  || stage.scrollWidth;
  const ch   = parseFloat(stage.style.height) || stage.scrollHeight;
  const pad  = 56;
  scale = Math.min((vw - pad * 2) / cw, (vh - pad * 2) / ch, 1);
  tx = (vw - cw * scale) / 2;
  ty = (vh - ch * scale) / 2;
  applyTransform(anim);
}

function doZoom(factor, cx, cy) {
  const vp   = document.getElementById('viewport');
  const rect = vp.getBoundingClientRect();
  const px   = (cx !== undefined ? cx : rect.left + rect.width  / 2) - rect.left;
  const py   = (cy !== undefined ? cy : rect.top  + rect.height / 2) - rect.top;
  const prev = scale;
  scale = Math.max(0.15, Math.min(3.5, scale * factor));
  tx   += px - px * (scale / prev);
  ty   += py - py * (scale / prev);
  applyTransform(false);
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
function buildTabs() {
  const bar = document.getElementById('tabBar');
  bar.innerHTML = '';
  Object.entries(SYSTEMS).forEach(([key, sys]) => {
    const btn = document.createElement('button');
    btn.className   = 'tab';
    btn.textContent = sys.label;
    btn.dataset.key = key;
    btn.onclick     = () => selectSystem(key);
    bar.appendChild(btn);
  });
}

function selectSystem(key) {
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.key === key));
  renderSystem(key);
}

// ─────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────
function openModal(node, el) {
  if (activeEl) activeEl.classList.remove('active');
  el.classList.add('active');
  activeEl = el;
  document.getElementById('modalTitle').innerHTML = node.info.title;
  document.getElementById('modalBody').innerHTML  = node.info.body;
  document.getElementById('overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('overlay').classList.remove('open');
  if (activeEl) { activeEl.classList.remove('active'); activeEl = null; }
}

// ─────────────────────────────────────────────
// INIT — called by loader.js after JSON data is ready
// ─────────────────────────────────────────────
function initApp(systems) {
  SYSTEMS = systems;

  // Wire up buttons (safe to call after DOM is ready)
  document.getElementById('btnZoomIn').onclick  = () => doZoom(1.2);
  document.getElementById('btnZoomOut').onclick = () => doZoom(0.8);
  document.getElementById('btnFit').onclick     = () => fitScreen(true);

  // Mouse wheel zoom
  document.getElementById('viewport').addEventListener('wheel', e => {
    e.preventDefault();
    doZoom(e.deltaY < 0 ? 1.12 : 0.88, e.clientX, e.clientY);
  }, { passive: false });

  // Mouse drag pan
  const vp = document.getElementById('viewport');
  vp.addEventListener('mousedown', e => {
    if (e.target.closest('.node')) return;
    dragging  = true;
    dragStart = { x: e.clientX - tx, y: e.clientY - ty };
    vp.classList.add('panning');
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    tx = e.clientX - dragStart.x;
    ty = e.clientY - dragStart.y;
    applyTransform(false);
  });
  document.addEventListener('mouseup', () => {
    dragging = false;
    vp.classList.remove('panning');
  });

  // Touch — single finger pan + two-finger pinch zoom
  let touch1 = null;
  let touch2 = null;
  let pinchStartDist  = 0;
  let pinchStartScale = 1;
  let pinchMid = null;

  function getTouchDist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
  function getTouchMid(a, b)  { return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; }

  vp.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      touch1 = { x: e.touches[0].clientX - tx, y: e.touches[0].clientY - ty };
      touch2 = null;
    } else if (e.touches.length === 2) {
      touch2 = null;
      pinchStartDist  = getTouchDist(e.touches[0], e.touches[1]);
      pinchStartScale = scale;
      pinchMid = getTouchMid(e.touches[0], e.touches[1]);
      const vRect = vp.getBoundingClientRect();
      pinchMid.x -= vRect.left;
      pinchMid.y -= vRect.top;
    }
  }, { passive: true });

  vp.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 1 && touch1 && !touch2) {
      tx = e.touches[0].clientX - touch1.x;
      ty = e.touches[0].clientY - touch1.y;
      applyTransform(false);
    } else if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      const factor = dist / pinchStartDist;
      const newScale = Math.max(0.15, Math.min(3.5, pinchStartScale * factor));
      const prev = scale;
      scale = newScale;
      tx += pinchMid.x - pinchMid.x * (scale / prev);
      ty += pinchMid.y - pinchMid.y * (scale / prev);
      applyTransform(false);
      touch1 = null;
    }
  }, { passive: false });

  vp.addEventListener('touchend', e => {
    if (e.touches.length === 0) { touch1 = null; touch2 = null; }
    else if (e.touches.length === 1) {
      touch1 = { x: e.touches[0].clientX - tx, y: e.touches[0].clientY - ty };
    }
  }, { passive: true });

  // Modal close
  document.getElementById('overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('overlay')) closeModal();
  });
  document.getElementById('modalClose').onclick = closeModal;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  window.addEventListener('resize', () => fitScreen(false));

  // Build tabs and show first system
  buildTabs();
  const firstKey = Object.keys(SYSTEMS)[0];
  if (firstKey) selectSystem(firstKey);
}