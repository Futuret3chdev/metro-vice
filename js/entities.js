import * as THREE from 'three';

export function createPlayerMesh() {
  const g = new THREE.Group();
  const parts = {};

  const skin = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.8 });
  const jacketMat = new THREE.MeshStandardMaterial({
    color: 0x1a1218,
    roughness: 0.45,
    metalness: 0.15
  });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0x2a2028, roughness: 0.7 });
  const jeansMat = new THREE.MeshStandardMaterial({ color: 0x1e2840, roughness: 0.85 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5, metalness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.1,
    metalness: 0.9
  });

  parts.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.3), jeansMat);
  parts.leftLeg.position.set(-0.16, 0.55, 0);
  parts.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.3), jeansMat);
  parts.rightLeg.position.set(0.16, 0.55, 0);

  parts.leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.38), bootMat);
  parts.leftBoot.position.set(-0.16, 0.11, 0.04);
  parts.rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.38), bootMat);
  parts.rightBoot.position.set(0.16, 0.11, 0.04);

  parts.torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.75, 0.38), jacketMat);
  parts.torso.position.set(0, 1.35, 0);

  parts.chest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.32), shirtMat);
  parts.chest.position.set(0, 1.42, 0.02);

  parts.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.26), jacketMat);
  parts.leftArm.position.set(-0.48, 1.28, 0);
  parts.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.72, 0.26), jacketMat);
  parts.rightArm.position.set(0.48, 1.28, 0);

  parts.head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.36), skin);
  parts.head.position.set(0, 1.92, 0);

  parts.jaw = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.34), skin);
  parts.jaw.position.set(0, 1.72, 0.01);

  parts.hair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.38), hairMat);
  parts.hair.position.set(0, 2.14, -0.02);

  parts.shades = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.12), glassMat);
  parts.shades.position.set(0, 1.94, 0.2);

  parts.chain = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.025, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.9, roughness: 0.2 })
  );
  parts.chain.position.set(0, 1.58, 0.18);
  parts.chain.rotation.x = Math.PI / 2;

  Object.values(parts).forEach((m) => {
    m.castShadow = true;
    g.add(m);
  });

  g.userData.parts = parts;
  g.userData.walkPhase = 0;
  g.userData.baseY = 0;
  return g;
}

export function animatePlayerWalk(mesh, moving, speed, dt) {
  const parts = mesh.userData.parts;
  if (!parts) return;

  if (moving) {
    mesh.userData.walkPhase += dt * speed * 1.1;
    const swing = Math.sin(mesh.userData.walkPhase) * 0.55;
    parts.leftLeg.rotation.x = swing;
    parts.rightLeg.rotation.x = -swing;
    parts.leftBoot.rotation.x = swing * 0.5;
    parts.rightBoot.rotation.x = -swing * 0.5;
    parts.leftArm.rotation.x = -swing * 0.65;
    parts.rightArm.rotation.x = swing * 0.65;
    parts.torso.rotation.z = Math.sin(mesh.userData.walkPhase * 0.5) * 0.04;
    mesh.position.y = mesh.userData.baseY + Math.abs(Math.sin(mesh.userData.walkPhase * 2)) * 0.06;
  } else {
    mesh.userData.walkPhase *= 0.9;
    const ease = 0.15;
    parts.leftLeg.rotation.x *= 1 - ease;
    parts.rightLeg.rotation.x *= 1 - ease;
    parts.leftBoot.rotation.x *= 1 - ease;
    parts.rightBoot.rotation.x *= 1 - ease;
    parts.leftArm.rotation.x *= 1 - ease;
    parts.rightArm.rotation.x *= 1 - ease;
    parts.torso.rotation.z *= 1 - ease;
    mesh.position.y = mesh.userData.baseY;
  }
}

export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
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