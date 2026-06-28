import { World } from './world.js?v=2';
import { toast } from './hud.js?v=2';

let world = null;
let rafId = null;

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(`${name}-screen`)?.classList.add('active');
}

function startGame() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  world?.dispose();
  try {
    world = new World(canvas);
    world.bindUI({ onMenu: stopGame });
    toast('Welcome to Metro Vice — steal a car, hit the yellow zone');
  } catch (err) {
    console.error(err);
    toast('Could not start 3D — try refresh or desktop browser');
    return;
  }

  showScreen('game');
  cancelAnimationFrame(rafId);

  const loop = () => {
    if (!world) return;
    const dt = Math.min(world.clock.getDelta(), 0.05);
    world.update(dt);
    world.render();
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
}

function stopGame() {
  cancelAnimationFrame(rafId);
  world?.dispose();
  world = null;
  showScreen('title');
}

document.getElementById('btn-play')?.addEventListener('click', () => {
  requestAnimationFrame(() => requestAnimationFrame(startGame));
});

showScreen('title');