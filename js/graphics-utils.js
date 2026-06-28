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
      renderer.toneMappingExposure = 1.05;
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