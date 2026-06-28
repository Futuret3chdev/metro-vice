import * as THREE from 'three';

export function createPlayerMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.45, 1.1, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0x2a8cff, roughness: 0.55, metalness: 0.1 })
  );
  body.position.y = 1.1;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.7 })
  );
  head.position.y = 2.05;
  g.add(body, head);
  g.castShadow = true;
  return g;
}

export function createCarMesh(color = 0xff3c78) {
  const g = new THREE.Group();
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.7, 4.2),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 })
  );
  chassis.position.y = 0.65;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.55, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x111822, roughness: 0.2, metalness: 0.7 })
  );
  cabin.position.set(0, 1.15, -0.2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  [[-0.9, 0.35, 1.3], [0.9, 0.35, 1.3], [-0.9, 0.35, -1.3], [0.9, 0.35, -1.3]].forEach(([x, y, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, y, z);
    g.add(w);
  });
  g.add(chassis, cabin);
  g.castShadow = true;
  g.userData.color = color;
  return g;
}

export function createWaypointMarker() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.5, 3.2, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.5 })
  );
  pillar.position.y = 4;
  g.add(ring, pillar);
  return g;
}

export function spawnTrafficCars(spawns, colors) {
  return spawns.slice(0, 6).map((s, i) => ({
    mesh: createCarMesh(colors[i % colors.length]),
    x: s.x,
    z: s.z,
    rot: s.rot,
    speed: 6 + (i % 3) * 2,
    lane: i % 2 === 0 ? 1 : -1
  }));
}

export function collideAABB(x, z, r, colliders) {
  for (const c of colliders) {
    const dx = Math.abs(x - c.x);
    const dz = Math.abs(z - c.z);
    if (dx < c.hw + r && dz < c.hd + r) return true;
  }
  return false;
}

export function clampToCity(x, z, extent) {
  const bound = extent * 0.48;
  return {
    x: THREE.MathUtils.clamp(x, -bound, bound),
    z: THREE.MathUtils.clamp(z, -bound, bound)
  };
}