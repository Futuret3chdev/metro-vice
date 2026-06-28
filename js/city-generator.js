import * as THREE from 'three';
import { getAsphaltTexture, getSidewalkTexture, getFacadeTexture } from './graphics-utils.js?v=2';

const BLOCK = 32;
const ROAD = 12;
const SIDEWALK = 2.5;
const GRID = 7;
const CELL = BLOCK + ROAD;

const PALETTE = [
  0x2a1f3d, 0x3d2a4a, 0x1e3348, 0x4a3040,
  0x283858, 0x3a2850, 0x1a2840, 0x503050
];
const NEON = [0xff3c78, 0x00e5ff, 0xffd54f, 0x7c4dff, 0xff6b35, 0x69f0ae];

function blockCenter(gx, gz) {
  const ox = -(GRID - 1) * CELL * 0.5;
  const oz = -(GRID - 1) * CELL * 0.5;
  return { x: ox + gx * CELL, z: oz + gz * CELL };
}

function roadCoord(i) {
  const ox = -(GRID - 1) * CELL * 0.5;
  return ox + i * CELL - CELL * 0.5;
}

function createFacade(width, height, depth, seed, neon, mobile) {
  const group = new THREE.Group();
  const bodyCol = PALETTE[seed % PALETTE.length];
  const neonCol = NEON[seed % NEON.length];
  const facadeTex = getFacadeTexture(seed, neonCol);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color: bodyCol,
      roughness: 0.72,
      metalness: 0.18,
      emissive: new THREE.Color(neonCol).multiplyScalar(0.03)
    })
  );
  body.position.y = height / 2;
  body.castShadow = !mobile;
  body.receiveShadow = !mobile;
  group.add(body);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1a1528,
    roughness: 0.5,
    metalness: 0.35
  });
  const winMat = new THREE.MeshStandardMaterial({
    map: facadeTex,
    emissive: new THREE.Color(neonCol),
    emissiveIntensity: 0.08,
    roughness: 0.4,
    metalness: 0.2
  });

  const addFace = (w, h, px, py, pz, ry) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.35), frameMat);
    frame.position.set(px, py, pz);
    frame.rotation.y = ry;
    group.add(frame);
    const windows = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.92), winMat);
    windows.position.set(px, py, pz);
    windows.rotation.y = ry;
    const zOff = 0.2;
    if (ry === 0) windows.position.z += zOff;
    else if (ry === Math.PI) windows.position.z -= zOff;
    else if (ry === Math.PI / 2) windows.position.x += zOff;
    else windows.position.x -= zOff;
    group.add(windows);
  };

  const midY = height * 0.45;
  addFace(width * 0.88, height * 0.75, 0, midY, depth / 2 + 0.12, 0);
  addFace(width * 0.88, height * 0.75, 0, midY, -depth / 2 - 0.12, Math.PI);
  addFace(depth * 0.88, height * 0.75, width / 2 + 0.12, midY, 0, Math.PI / 2);
  addFace(depth * 0.88, height * 0.75, -width / 2 - 0.12, midY, 0, -Math.PI / 2);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.6, 0.5, depth + 0.6),
    new THREE.MeshStandardMaterial({ color: 0x15121e, roughness: 0.85, metalness: 0.1 })
  );
  roof.position.y = height + 0.25;
  group.add(roof);

  if ((seed % 4) !== 0) {
    const ac = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.6, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x444455, roughness: 0.6, metalness: 0.4 })
    );
    ac.position.set((seed % 3 - 1) * 3, height + 0.7, (seed % 5 - 2) * 2);
    group.add(ac);
  }

  if ((seed % 3) === 0) {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.55, 1.4, 0.25),
      new THREE.MeshStandardMaterial({
        color: neonCol,
        emissive: neonCol,
        emissiveIntensity: 0.85,
        roughness: 0.25
      })
    );
    sign.position.set(0, height * 0.62, depth / 2 + 0.55);
    group.add(sign);
    if (!mobile) {
      const glow = new THREE.PointLight(neonCol, 0.35, 18);
      glow.position.copy(sign.position);
      glow.position.y += 0.5;
      group.add(glow);
    }
  }

  if (height > 28 && (seed % 2) === 0) {
    const spire = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 6 + (seed % 4) * 3, 1.2),
      new THREE.MeshStandardMaterial({
        color: 0x8899bb,
        emissive: 0x334466,
        emissiveIntensity: 0.2,
        metalness: 0.6,
        roughness: 0.3
      })
    );
    spire.position.y = height + 3.5;
    group.add(spire);
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4466 })
    );
    beacon.position.y = height + 7 + (seed % 4) * 1.5;
    group.add(beacon);
  }

  return group;
}

function addStreetLamp(group, x, z, mobile) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 5.2, 6),
    new THREE.MeshStandardMaterial({ color: 0x2a3040, metalness: 0.5, roughness: 0.4 })
  );
  pole.position.set(x, 2.6, z);
  group.add(pole);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.2, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x445566, emissive: 0xffaa55, emissiveIntensity: 0.5 })
  );
  head.position.set(x, 5.3, z);
  group.add(head);
  if (!mobile) {
    const light = new THREE.PointLight(0xffcc88, 0.55, 32);
    light.position.set(x, 5.2, z);
    group.add(light);
  }
}

function addPalmTree(group, x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.28, 4.5, 6),
    new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
  );
  trunk.position.set(x, 2.25, z);
  group.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x1a6b3a, roughness: 0.8 });
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 5), leafMat);
    leaf.position.set(x, 4.8 + i * 0.15, z);
    leaf.rotation.z = (i - 2) * 0.35;
    leaf.rotation.x = 0.4;
    group.add(leaf);
  }
}

function addBillboard(group, x, z, rot, seed) {
  const neonCol = NEON[seed % NEON.length];
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 8, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.4 })
  );
  post.position.set(x, 4, z);
  group.add(post);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(6, 3.5, 0.3),
    new THREE.MeshStandardMaterial({
      color: neonCol,
      emissive: neonCol,
      emissiveIntensity: 0.7,
      roughness: 0.3
    })
  );
  board.position.set(x, 7.5, z);
  board.rotation.y = rot;
  group.add(board);
}

export function generateCity(scene, mobile) {
  const group = new THREE.Group();
  const colliders = [];
  const carSpawns = [];
  const extent = (GRID - 1) * CELL + BLOCK + ROAD * 2;

  const asphalt = getAsphaltTexture();
  const sidewalkTex = getSidewalkTexture();

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(extent + 120, extent + 120),
    new THREE.MeshStandardMaterial({ color: 0x0e0c14, roughness: 0.98 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = !mobile;
  group.add(ground);

  const roadMat = new THREE.MeshStandardMaterial({
    map: asphalt,
    roughness: 0.88,
    metalness: 0.05
  });
  const walkMat = new THREE.MeshStandardMaterial({
    map: sidewalkTex,
    roughness: 0.82,
    metalness: 0.05
  });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffd54f });
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });

  for (let i = 0; i <= GRID; i++) {
    const rz = roadCoord(i);
    const roadH = new THREE.Mesh(
      new THREE.PlaneGeometry(extent + 40, ROAD),
      roadMat
    );
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.03, rz);
    group.add(roadH);

    const walkH = new THREE.Mesh(
      new THREE.PlaneGeometry(extent + 40, SIDEWALK),
      walkMat
    );
    walkH.rotation.x = -Math.PI / 2;
    walkH.position.set(0, 0.05, rz + ROAD / 2 + SIDEWALK / 2);
    group.add(walkH);
    const walkH2 = walkH.clone();
    walkH2.position.z = rz - ROAD / 2 - SIDEWALK / 2;
    group.add(walkH2);

    const rx = roadCoord(i);
    const roadV = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD, extent + 40),
      roadMat
    );
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(rx, 0.03, 0);
    group.add(roadV);

    const walkV = new THREE.Mesh(
      new THREE.PlaneGeometry(SIDEWALK, extent + 40),
      walkMat
    );
    walkV.rotation.x = -Math.PI / 2;
    walkV.position.set(rx + ROAD / 2 + SIDEWALK / 2, 0.05, 0);
    group.add(walkV);
    const walkV2 = walkV.clone();
    walkV2.position.x = rx - ROAD / 2 - SIDEWALK / 2;
    group.add(walkV2);
  }

  for (let i = 0; i < GRID; i++) {
    const rz = roadCoord(i) + CELL * 0.5;
    for (let j = 0; j < 8; j++) {
      const lx = (j - 3.5) * (BLOCK / 4);
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 2.5), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(lx, 0.06, rz);
      group.add(dash);
    }
  }

  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      const { x: cx, z: cz } = blockCenter(gx, gz);
      const seed = gx * 17 + gz * 31;
      const isPark = gx === Math.floor(GRID / 2) && gz === Math.floor(GRID / 2);
      const isPlaza = (gx + gz) % 5 === 0 && !isPark;

      if (isPark) {
        const park = new THREE.Mesh(
          new THREE.CircleGeometry(BLOCK * 0.42, 32),
          new THREE.MeshStandardMaterial({ color: 0x1a5c32, roughness: 0.92 })
        );
        park.rotation.x = -Math.PI / 2;
        park.position.set(cx, 0.04, cz);
        group.add(park);
        const fountain = new THREE.Mesh(
          new THREE.CylinderGeometry(2.5, 3, 1.2, 16),
          new THREE.MeshStandardMaterial({ color: 0x445566, metalness: 0.5, roughness: 0.35 })
        );
        fountain.position.set(cx, 0.6, cz);
        group.add(fountain);
        const water = new THREE.Mesh(
          new THREE.CircleGeometry(2.2, 16),
          new THREE.MeshStandardMaterial({
            color: 0x2266aa,
            emissive: 0x113355,
            emissiveIntensity: 0.3,
            metalness: 0.8,
            roughness: 0.1
          })
        );
        water.rotation.x = -Math.PI / 2;
        water.position.set(cx, 0.85, cz);
        group.add(water);
        addPalmTree(group, cx - 8, cz - 6);
        addPalmTree(group, cx + 9, cz + 5);
        continue;
      }

      if (isPlaza) {
        const plaza = new THREE.Mesh(
          new THREE.PlaneGeometry(BLOCK - 2, BLOCK - 2),
          new THREE.MeshStandardMaterial({ color: 0x3a3848, roughness: 0.7 })
        );
        plaza.rotation.x = -Math.PI / 2;
        plaza.position.set(cx, 0.04, cz);
        group.add(plaza);
        addBillboard(group, cx, cz - BLOCK / 2 - 4, 0, seed);
        continue;
      }

      const tier = seed % 7;
      const floors = tier < 2 ? 3 + (seed % 3) : tier < 5 ? 6 + (seed % 5) : 12 + (seed % 8);
      const h = floors * 3.1 + 2;
      const inset = 1.5 + (seed % 3);
      const w = BLOCK - inset * 2;
      const d = BLOCK - inset * 2;
      const neonCol = NEON[seed % NEON.length];

      const building = createFacade(w, h, d, seed, neonCol, mobile);
      building.position.set(cx, 0, cz);
      group.add(building);
      colliders.push({ x: cx, z: cz, hw: w / 2 + 0.4, hd: d / 2 + 0.4 });

      if ((seed % 6) === 0) {
        const cw = new THREE.Mesh(new THREE.PlaneGeometry(ROAD * 0.7, 1.2), crossMat);
        cw.rotation.x = -Math.PI / 2;
        cw.position.set(cx, 0.07, cz + BLOCK / 2 + ROAD / 2);
        group.add(cw);
      }
    }
  }

  for (let gx = 0; gx < GRID; gx++) {
    for (let gz = 0; gz < GRID; gz++) {
      const { x: cx, z: cz } = blockCenter(gx, gz);
      const seed = gx * 13 + gz * 7;
      if (seed % 3 === 0) {
        addStreetLamp(group, cx + BLOCK / 2 + 1.5, cz, mobile);
      }
      if (seed % 5 === 1) {
        addStreetLamp(group, cx - BLOCK / 2 - 1.5, cz + BLOCK / 2, mobile);
      }
    }
  }

  const spawnAngles = [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6];
  spawnAngles.forEach((a, i) => {
    const r = 14 + (i % 4) * 10;
    carSpawns.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, rot: a + Math.PI / 2 });
  });

  for (let i = 0; i < 6; i++) {
    const lane = roadCoord(i % (GRID + 1)) + ROAD * 0.25;
    carSpawns.push({
      x: (i - 2.5) * 28,
      z: lane,
      rot: i % 2 === 0 ? 0 : Math.PI
    });
  }

  scene.add(group);
  const missionX = blockCenter(GRID - 1, 0).x;
  const missionZ = blockCenter(0, GRID - 1).z;
  return { group, colliders, carSpawns, extent, missionTarget: { x: missionX, z: missionZ } };
}