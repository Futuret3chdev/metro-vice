import * as THREE from 'three';

export function isMobile() {
  return window.innerWidth < 700 || window.matchMedia('(pointer: coarse)').matches;
}

export function getParentSize(parent) {
  if (!parent) return { w: 0, h: 0 };
  let w = parent.clientWidth;
  let h = parent.clientHeight;
  if (w < 2 || h < 2) {
    const rect = parent.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
  }
  if (w < 2 || h < 2) {
    const vv = window.visualViewport;
    w = vv?.width || window.innerWidth;
    h = vv?.height || window.innerHeight;
  }
  return { w: Math.floor(w), h: Math.floor(h) };
}

export function initRenderer(canvas) {
  const mobile = isMobile();
  for (const antialias of [true, false]) {
    try {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = !mobile;
      if (!mobile) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      return { renderer, mobile };
    } catch (_) { /* retry */ }
  }
  return { renderer: null, mobile };
}

export function observeResize(parent, onResize) {
  if (!parent) return () => {};
  const tick = () => onResize();
  const ro = new ResizeObserver(tick);
  ro.observe(parent);
  window.visualViewport?.addEventListener('resize', tick);
  window.addEventListener('orientationchange', tick);
  requestAnimationFrame(tick);
  [50, 300, 800].forEach((ms) => setTimeout(tick, ms));
  return () => {
    ro.disconnect();
    window.visualViewport?.removeEventListener('resize', tick);
    window.removeEventListener('orientationchange', tick);
  };
}

export function createCanvasTexture(drawFn, w, h, repeat = { x: 1, y: 1 }) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat.x, repeat.y);
  return tex;
}

const _texCache = new Map();

export function getAsphaltTexture() {
  if (_texCache.has('asphalt')) return _texCache.get('asphalt');
  const tex = createCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#1a1824';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 800; i++) {
      const g = 18 + Math.random() * 22;
      ctx.fillStyle = `rgb(${g},${g - 2},${g + 4})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    ctx.strokeStyle = 'rgba(255,213,79,0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
  }, 256, 256, { x: 4, y: 4 });
  _texCache.set('asphalt', tex);
  return tex;
}

export function getSidewalkTexture() {
  if (_texCache.has('sidewalk')) return _texCache.get('sidewalk');
  const tex = createCanvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#3a3848';
    ctx.fillRect(0, 0, w, h);
    const tile = 16;
    for (let y = 0; y < h; y += tile) {
      for (let x = 0; x < w; x += tile) {
        const shade = 52 + ((x + y) % (tile * 2) ? 6 : 0);
        ctx.fillStyle = `rgb(${shade},${shade - 2},${shade + 2})`;
        ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
      }
    }
  }, 128, 128, { x: 3, y: 3 });
  _texCache.set('sidewalk', tex);
  return tex;
}

export function getFacadeTexture(seed, neonHex) {
  const key = `facade-${seed}-${neonHex}`;
  if (_texCache.has(key)) return _texCache.get(key);
  const rng = (n) => {
    const v = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const tex = createCanvasTexture((ctx, w, h) => {
    const base = 28 + Math.floor(rng(1) * 18);
    ctx.fillStyle = `rgb(${base},${base - 6},${base + 12})`;
    ctx.fillRect(0, 0, w, h);
    const cols = 6 + Math.floor(rng(2) * 4);
    const rows = 10 + Math.floor(rng(3) * 8);
    const pw = w / cols;
    const ph = h / rows;
    const neon = `#${neonHex.toString(16).padStart(6, '0')}`;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = rng(r * cols + c) > 0.42;
        const wx = c * pw + 3;
        const wy = r * ph + 3;
        const ww = pw - 6;
        const wh = ph - 6;
        if (lit) {
          const warm = rng(r + c) > 0.55;
          ctx.fillStyle = warm ? 'rgba(255,220,160,0.9)' : neon;
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = 'rgba(8,12,22,0.95)';
          ctx.shadowBlur = 0;
        }
        ctx.fillRect(wx, wy, ww, wh);
        ctx.shadowBlur = 0;
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * pw, 0);
      ctx.lineTo(c * pw, h);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * ph);
      ctx.lineTo(w, r * ph);
      ctx.stroke();
    }
  }, 128, 256);
  _texCache.set(key, tex);
  return tex;
}

export function createSkyGradient() {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2a1848');
  grad.addColorStop(0.35, '#1a1030');
  grad.addColorStop(0.7, '#12081c');
  grad.addColorStop(1, '#0a0612');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}