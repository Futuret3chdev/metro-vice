export function toast(msg, ms = 2800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), ms);
}

export function updateHUD(state) {
  const cash = document.getElementById('hud-cash');
  const bar = document.getElementById('health-bar');
  const wanted = document.getElementById('hud-wanted');
  const mode = document.getElementById('hud-mode');
  const mission = document.getElementById('mission-text');

  if (cash) cash.textContent = Math.floor(state.cash);
  if (bar) bar.style.width = `${Math.max(0, state.health)}%`;
  if (mode) mode.textContent = state.inVehicle ? '🚗 DRIVING' : '🚶 ON FOOT';

  if (wanted) {
    wanted.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.className = 'star' + (i < state.wanted ? ' on' : '');
      s.textContent = '★';
      wanted.appendChild(s);
    }
  }

  if (mission && state.activeMission) {
    mission.textContent = state.activeMission.desc;
  }

  const actionBtn = document.getElementById('mob-action');
  if (actionBtn) actionBtn.textContent = state.inVehicle ? '🚶 Exit' : '🚗 Drive';
}

export function showMissionComplete(mission, state) {
  toast(`✓ ${mission.title} — +$${mission.reward}`);
  state.cash += mission.reward;
}