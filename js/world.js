import * as THREE from 'three';
import { initRenderer, getParentSize, observeResize, createSkyGradient } from './graphics-utils.js?v=2';
import { generateCity } from './city-generator.js?v=2';
import {
  createPlayerMesh, createCarMesh, createWaypointMarker,
  spawnTrafficCars, collideAABB, clampToCity,
  animatePlayerWalk, lerpAngle
} from './entities.js?v=2';
import { InputManager } from './input.js?v=2';
import { MISSIONS, getMissionTarget, checkMissionComplete } from './missions.js?v=2';
import { updateHUD, toast, showMissionComplete } from './hud.js?v=2';

const CAR_COLORS = [0xff3c78, 0x00e5ff, 0xffd54f, 0x69f0ae, 0x7c4dff, 0xff6b35];

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    const gpu = initRenderer(canvas);
    if (!gpu.renderer) throw new Error('WebGL unavailable');
    this.renderer = gpu.renderer;
    this.mobile = gpu.mobile;

    this.scene = new THREE.Scene();
    this.scene.background = createSkyGradient();
    this.scene.fog = new THREE.FogExp2(0x12081c, 0.008);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.5, 400);
    this.clock = new THREE.Clock();
    this.input = new InputManager();
    this.input.bindLook(canvas);

    this.state = {
      x: 0, z: 12, rot: 0,
      health: 100, cash: 500, wanted: 0,
      inVehicle: false, vehicleSpeed: 0,
      missionIndex: 0, activeMission: MISSIONS[0]
    };

    this._camYaw = Math.PI;
    this._camPitch = 0.38;
    this._camDist = 9;

    this._buildLights();
    this.city = generateCity(this.scene, this.mobile);

    this.player = createPlayerMesh();
    this.player.position.set(this.state.x, 0, this.state.z);
    this.scene.add(this.player);

    this.parkedCars = this.city.carSpawns.map((s, i) => ({
      mesh: createCarMesh(CAR_COLORS[i % CAR_COLORS.length]),
      x: s.x, z: s.z, rot: s.rot, occupied: false
    }));
    this.parkedCars.forEach((c) => {
      c.mesh.position.set(c.x, 0, c.z);
      c.mesh.rotation.y = c.rot;
      this.scene.add(c.mesh);
    });

    this.traffic = spawnTrafficCars(this.city.carSpawns, CAR_COLORS);
    this.traffic.forEach((t) => {
      t.mesh.position.set(t.x, 0, t.z);
      t.mesh.rotation.y = t.rot;
      this.scene.add(t.mesh);
    });

    this.vehicle = createCarMesh(0xff3c78);
    this.vehicle.visible = false;
    this.scene.add(this.vehicle);

    this.waypoint = createWaypointMarker();
    this._setWaypoint();
    this.scene.add(this.waypoint);

    const resizeRoot = canvas.parentElement;
    this._stopResize = observeResize(resizeRoot, () => this.resize());
    this.resize();
  }

  _buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x99aacc, 0x1a0a20, 0.55));
    const sun = new THREE.DirectionalLight(0xffeedd, 0.85);
    sun.position.set(60, 90, 40);
    if (!this.mobile) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -100;
      sun.shadow.camera.right = 100;
      sun.shadow.camera.top = 100;
      sun.shadow.camera.bottom = -100;
    }
    this.scene.add(sun);
    const moon = new THREE.DirectionalLight(0x6688cc, 0.35);
    moon.position.set(-40, 60, -50);
    this.scene.add(moon);
  }

  _setWaypoint() {
    const t = getMissionTarget(this.state.missionIndex, this.city);
    this.waypoint.position.set(t.x, 0.1, t.z);
    this._missionTarget = t;
  }

  bindUI(handlers) {
    this.input.bindMobile({
      onMenu: handlers.onMenu,
      onMissionPing: () => {
        toast(this.state.activeMission?.desc || 'No mission');
        this._camYaw = Math.atan2(
          this._missionTarget.x - this.state.x,
          this._missionTarget.z - this.state.z
        );
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        toast(this.state.activeMission?.desc || 'No mission');
        this._camYaw = Math.atan2(
          this._missionTarget.x - this.state.x,
          this._missionTarget.z - this.state.z
        );
      }
    });
  }

  resize() {
    const parent = this.canvas.parentElement;
    let { w, h } = getParentSize(parent);
    if (w < 2) w = window.innerWidth;
    if (h < 2) h = window.innerHeight;
    if (w < 2 || h < 2) return;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _nearestCar() {
    let best = null;
    let bestD = 4.5;
    const list = this.state.inVehicle ? [] : this.parkedCars.filter((c) => !c.occupied);
    for (const c of list) {
      const d = Math.hypot(c.x - this.state.x, c.z - this.state.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  _enterCar(car) {
    car.occupied = true;
    car.mesh.visible = false;
    this.vehicle.visible = true;
    const col = car.mesh.userData.color || 0xff3c78;
    this.vehicle.traverse((o) => {
      if (o.isMesh && o.material?.color && o.geometry?.type === 'BoxGeometry') {
        o.material.color.setHex(col);
      }
    });
    this.state.inVehicle = true;
    this.state.x = car.x;
    this.state.z = car.z;
    this.state.rot = car.rot;
    this.state.vehicleSpeed = 0;
    this.player.visible = false;
    toast('Hit the streets — WASD to drive');
  }

  _exitCar() {
    const car = this.parkedCars.find((c) => c.occupied);
    if (car) {
      car.x = this.state.x + Math.sin(this.state.rot) * 2.2;
      car.z = this.state.z + Math.cos(this.state.rot) * 2.2;
      car.rot = this.state.rot;
      car.mesh.position.set(car.x, 0, car.z);
      car.mesh.rotation.y = car.rot;
      car.mesh.visible = true;
      car.occupied = false;
    }
    this.vehicle.visible = false;
    this.state.inVehicle = false;
    this.state.vehicleSpeed = 0;
    this.player.visible = true;
    this.player.position.set(this.state.x, 0, this.state.z);
    toast('Back on foot');
  }

  _tryInteract() {
    if (this.state.inVehicle) {
      this._exitCar();
      return;
    }
    const car = this._nearestCar();
    if (car) this._enterCar(car);
    else toast('No ride nearby — find a parked car');
  }

  _updateOnFoot(dt) {
    const move = this.input.getMoveVector();
    const sprint = this.input.isSprinting();
    const speed = sprint ? 11 : 6.5;

    const look = this.input.getLookDelta();
    if (Math.abs(look.x) > 0.001 || Math.abs(look.y) > 0.001) {
      this._camYaw -= look.x * 2.8;
      this._camPitch = THREE.MathUtils.clamp(this._camPitch - look.y * 2.2, 0.18, 0.72);
    }

    const moving = Math.abs(move.x) > 0.05 || Math.abs(move.y) > 0.05;
    let moveSpeed = 0;

    if (moving) {
      const fwdX = Math.sin(this._camYaw);
      const fwdZ = Math.cos(this._camYaw);
      const rightX = Math.cos(this._camYaw);
      const rightZ = -Math.sin(this._camYaw);

      const mx = fwdX * move.y + rightX * move.x;
      const mz = fwdZ * move.y + rightZ * move.x;
      const len = Math.hypot(mx, mz) || 1;
      const nx = mx / len;
      const nz = mz / len;

      const moveAngle = Math.atan2(nx, nz);
      this.state.rot = lerpAngle(this.state.rot, moveAngle, 0.18);

      let px = this.state.x + nx * speed * dt;
      let pz = this.state.z + nz * speed * dt;

      const clamped = clampToCity(px, pz, this.city.extent);
      if (!collideAABB(clamped.x, clamped.z, 0.5, this.city.colliders)) {
        this.state.x = clamped.x;
        this.state.z = clamped.z;
        moveSpeed = speed;
      }
    }

    this.player.position.set(this.state.x, 0, this.state.z);
    this.player.rotation.y = this.state.rot;
    animatePlayerWalk(this.player, moving && moveSpeed > 0, moveSpeed, dt);
  }

  _updateDriving(dt) {
    const move = this.input.getMoveVector();
    const accel = this.input.isSprinting() ? 28 : 18;
    const maxSpeed = this.input.isSprinting() ? 42 : 32;
    const friction = 8;

    const look = this.input.getLookDelta();
    if (Math.abs(look.x) > 0.001) {
      this._camYaw -= look.x * 2.2;
    }

    if (move.y < -0.1) this.state.vehicleSpeed += accel * dt;
    else if (move.y > 0.1) this.state.vehicleSpeed -= accel * dt;
    else this.state.vehicleSpeed -= friction * dt * Math.sign(this.state.vehicleSpeed || 1);

    if (Math.abs(move.x) > 0.1 && Math.abs(this.state.vehicleSpeed) > 1) {
      const turn = move.x * (this.state.vehicleSpeed > 0 ? 1 : -1);
      this.state.rot -= turn * 1.8 * dt;
    }

    this.state.vehicleSpeed = THREE.MathUtils.clamp(this.state.vehicleSpeed, -12, maxSpeed);

    let nx = this.state.x + Math.sin(this.state.rot) * this.state.vehicleSpeed * dt;
    let nz = this.state.z + Math.cos(this.state.rot) * this.state.vehicleSpeed * dt;
    const clamped = clampToCity(nx, nz, this.city.extent);

    if (collideAABB(clamped.x, clamped.z, 1.2, this.city.colliders)) {
      this.state.vehicleSpeed *= -0.35;
      this.state.health = Math.max(0, this.state.health - 4);
      if (Math.abs(this.state.vehicleSpeed) > 8) {
        this.state.wanted = Math.min(5, this.state.wanted + 1);
        toast('💥 Crash — cops noticed');
      }
    } else {
      this.state.x = clamped.x;
      this.state.z = clamped.z;
    }

    this.vehicle.position.set(this.state.x, 0, this.state.z);
    this.vehicle.rotation.y = this.state.rot;
  }

  _updateTraffic(dt) {
    this.traffic.forEach((t) => {
      t.x += Math.sin(t.rot) * t.speed * t.lane * dt;
      t.z += Math.cos(t.rot) * t.speed * t.lane * dt;
      const c = clampToCity(t.x, t.z, this.city.extent);
      t.x = c.x;
      t.z = c.z;
      if (collideAABB(t.x, t.z, 1, this.city.colliders)) t.lane *= -1;
      t.mesh.position.set(t.x, 0, t.z);
      t.mesh.rotation.y = t.rot;
    });
  }

  _updateCamera() {
    const target = this.state.inVehicle ? this.vehicle.position : this.player.position;
    const cx = target.x - Math.sin(this._camYaw) * this._camDist * Math.cos(this._camPitch);
    const cz = target.z - Math.cos(this._camYaw) * this._camDist * Math.cos(this._camPitch);
    const cy = 2.8 + Math.sin(this._camPitch) * this._camDist;
    this.camera.position.lerp(new THREE.Vector3(cx, cy, cz), 0.14);
    this.camera.lookAt(target.x, 1.6, target.z);
  }

  _updateMission() {
    const m = this.state.activeMission;
    if (!m || m.complete) return;
    if (checkMissionComplete(m, this.state, this._missionTarget)) {
      m.complete = true;
      showMissionComplete(m, this.state);
      this.state.missionIndex++;
      if (this.state.missionIndex < MISSIONS.length) {
        this.state.activeMission = MISSIONS[this.state.missionIndex];
        this._setWaypoint();
        toast(`Next: ${this.state.activeMission.title}`);
      } else {
        toast('All missions cleared — free roam unlocked');
        this.waypoint.visible = false;
      }
    }
    this.waypoint.rotation.y += 0.02;
    this.waypoint.children[0].material.opacity = 0.55 + Math.sin(performance.now() * 0.004) * 0.3;
  }

  _decayWanted(dt) {
    if (this.state.wanted > 0 && !this.state.inVehicle) {
      this._wantedTimer = (this._wantedTimer || 0) + dt;
      if (this._wantedTimer > 8) {
        this.state.wanted = Math.max(0, this.state.wanted - 1);
        this._wantedTimer = 0;
      }
    } else {
      this._wantedTimer = 0;
    }
  }

  update(dt) {
    if (this.input.consumeAction()) this._tryInteract();

    if (this.state.inVehicle) this._updateDriving(dt);
    else this._updateOnFoot(dt);

    this._updateTraffic(dt);
    this._updateMission();
    this._decayWanted(dt);
    this._updateCamera();
    updateHUD(this.state);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._stopResize?.();
    this.renderer.dispose();
  }
}