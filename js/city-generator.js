import * as THREE from 'three';

const BLOCK = 36;
const ROAD = 10;
const GRID = 7;

const PALETTE = [
  0x2a1f3d, 0x3d2a4a, 0x1e3348, 0x4a3040,
  0x283858, 0x3a2850, 0x1a2840, 0x503050
];
const NEON = [0xff3c78, 0x00e5ff, 0xffd54f, 0x7c4dff];

export function generateCity(scene, mobile) {
  const group = new THREE.Group();
  const colliders = [];
  const carSpawns = [];
  const extent = GRID * (BLOCK + ROAD);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(extent + 80, extent + 80),
    new THREE.MeshStandardMaterial({ color: 0x14101c, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({ color: 0x1c1828, roughness: 0.85, metalness: 0.1 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });

  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      const cx = (gx - GRID / 2 + 0.5) * (BLOCK + ROAD);
      const cz = (gz - GRID / 2 + 0.5) * (BLOCK + ROAD);

      const roadH = new THREE.Mesh(new THREE.PlaneGeometry(BLOCK + ROAD, ROAD), roadMat);
      roadH.rotation.x = -Math.PI / 2;
      roadH.position.set(cx, 0.02, cz);
      group.add(roadH);

      const roadV = new THREE.Mesh(new THREE.PlaneGeometry(ROAD, BLOCK + ROAD), roadMat);
      roadV.rotation.x = -Math.PI / 2;
      roadV.position.set(cx, 0.02, cz);
      group.add(roadV);

      if (gx % 2 === 0 && gz % 2 === 0) {
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.3, BLOCK * 0.6), lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(cx, 0.04, cz);
        group.add(line);
      }

      const seed = gx * 17 + gz * 31;
      const floors = 2 + (seed % 6);
      const h = floors * 3.2 + 2;
      const w = BLOCK - 4;
      const d = BLOCK - 4;
      const col = PALETTE[seed % PALETTE.length];

      const building = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.65,
          metalness: 0.15,
          emissive: new THREE.Color(NEON[seed % NEON.length]).multiplyScalar(0.04)
        })
      );
      building.position.set(cx, h / 2, cz);
      building.castShadow = !mobile;
      building.receiveShadow = !mobile;
      group.add(building);
      colliders.push({ x: cx, z: cz, hw: w / 2 + 0.5, hd: d / 2 + 0.5 });

      if ((seed % 5) === 0) {
        const sign = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.6, 1.2, 0.3),
          new THREE.MeshStandardMaterial({
            color: NEON[seed % NEON.length],
            emissive: NEON[seed % NEON.length],
            emissiveIntensity: 0.6
          })
        );
        sign.position.set(cx, h * 0.55, cz + d / 2 + 0.2);
        group.add(sign);
      }
    }
  }

  const park = new THREE.Mesh(
    new THREE.CircleGeometry(14, 24),
    new THREE.MeshStandardMaterial({ color: 0x1a4a2a, roughness: 0.9 })
  );
  park.rotation.x = -Math.PI / 2;
  park.position.set(0, 0.03, 0);
  group.add(park);

  const lampMat = new THREE.MeshStandardMaterial({ color: 0x334455, emissive: 0xffaa44, emissiveIntensity: 0.3 });
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const r = 22;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 5, 6), lampMat);
    pole.position.set(Math.cos(angle) * r, 2.5, Math.sin(angle) * r);
    group.add(pole);
    if (!mobile) {
      const light = new THREE.PointLight(0xffcc88, 0.4, 28);
      light.position.set(pole.position.x, 5, pole.position.z);
      group.add(light);
    }
  }

  const spawnAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5, 0.7, 2.1, 3.5, 5.0];
  spawnAngles.forEach((a, i) => {
    const r = 18 + (i % 3) * 8;
    carSpawns.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, rot: a + Math.PI / 2 });
  });

  scene.add(group);
  return { group, colliders, carSpawns, extent, missionTarget: { x: (GRID / 2 - 1) * (BLOCK + ROAD), z: -(GRID / 2 - 1) * (BLOCK + ROAD) } };
}