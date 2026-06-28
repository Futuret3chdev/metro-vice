export const MISSIONS = [
  {
    id: 'first_ride',
    title: 'Wheels Up',
    desc: 'Jack a ride and hit the yellow zone downtown',
    reward: 200,
    type: 'reach',
    needsVehicle: true
  },
  {
    id: 'cash_run',
    title: 'Cash Run',
    desc: 'Reach the drop-off across the city — stay fast',
    reward: 350,
    type: 'reach',
    needsVehicle: false
  },
  {
    id: 'night_circuit',
    title: 'Night Circuit',
    desc: 'Circle the neon district without crashing',
    reward: 500,
    type: 'reach',
    needsVehicle: true
  }
];

export function getMissionTarget(index, city) {
  const offsets = [
    city.missionTarget,
    { x: -city.missionTarget.x * 0.6, z: city.missionTarget.z * 0.5 },
    { x: city.missionTarget.x * 0.3, z: -city.missionTarget.z * 0.8 }
  ];
  return offsets[index % offsets.length];
}

export function checkMissionComplete(mission, state, target) {
  if (!mission || mission.complete) return false;
  const dx = state.x - target.x;
  const dz = state.z - target.z;
  const dist = Math.hypot(dx, dz);
  if (mission.needsVehicle && !state.inVehicle) return false;
  return dist < 6;
}