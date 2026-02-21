<template>
  <div class="relative w-full h-full">
    <NuxtRouteAnnouncer />
    <canvas ref="canvasEl" id="game" class="block w-full h-full cursor-none" @click="requestLock"></canvas>

    <div v-if="!locked" class="fixed inset-0 flex items-center justify-center bg-black/60 cursor-pointer z-100" @click="requestLock">
      <span class="text-4xl text-white">Click to play</span>
    </div>

    <div v-if="locked" class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[1.6rem] text-white/70 pointer-events-none z-50 [text-shadow:0_0_4px_rgba(0,0,0,0.8)] font-mono leading-none">+</div>

    <div class="fixed top-3.5 left-3.5 right-3.5 flex justify-between gap-3 pointer-events-none max-[900px]:flex-col max-[900px]:items-start">
      <section class="pointer-events-auto py-3 px-3.5">
        <p class="my-0.5">Score: {{ score }}</p>
        <p class="my-0.5">Shots: {{ shots }}</p>
        <p class="my-0.5">Status: {{ statusText }}</p>
      </section>

      <div class="pointer-events-auto flex gap-1.5">
        <button
          v-for="c in colors" :key="c"
          class="w-5 h-5 rounded-full border border-transparent transition-all duration-150"
          :class="switches[c] ? 'opacity-100 scale-110' : 'opacity-25'"
          :style="{ '--sw-color': switchColors[c], backgroundColor: switchColors[c] }"
          @click="setColor(c)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const canvasEl = ref(null);
const score = ref(0);
const shots = ref(0);
const locked = ref(false);
const switches = reactive({
  red: true,
  yellow: false,
  blue: false,
  white: false,
});
const keys = reactive({
  w: false,
  a: false,
  s: false,
  d: false,
});

const colors = ["red", "yellow", "blue", "white"];
const switchColors = { red: "#ff5b5b", yellow: "#ffe28a", blue: "#87bbff", white: "#f7f7f7" };

const bulletPalette = {
  red: { color: "#ff5b5b", emissive: "#ff2222" },
  yellow: { color: "#ffe28a", emissive: "#ffb300" },
  blue: { color: "#87bbff", emissive: "#1b6dff" },
  white: { color: "#f7f7f7", emissive: "#d8d8d8" },
};

const actorPalette = {
  red: { body: "#ff5b5b", detail: "#ff2222", glow: "#ff4444" },
  yellow: { body: "#ffe28a", detail: "#ffb300", glow: "#ffcc44" },
  blue: { body: "#87bbff", detail: "#1b6dff", glow: "#4488ff" },
  white: { body: "#f8f8f8", detail: "#dfdfdf", glow: "#ffffff" },
};

const activeColor = ref("red");

function setColor(c) {
  if (!bulletPalette[c]) return;
  activeColor.value = c;
  for (const n of colors) switches[n] = n === c;
}

function requestLock() {
  canvasEl.value?.requestPointerLock();
}

const statusText = computed(() => {
  if (keys.w || keys.a || keys.s || keys.d) return "Moving";
  return "Idle";
});

let cleanup = () => {};

onMounted(async () => {
  if (!canvasEl.value) return;

  const THREE = await import("three");
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl.value, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#040404");
  scene.fog = new THREE.Fog("#050505", 14, 80);

  const camera = new THREE.PerspectiveCamera(75, 2, 0.1, 200);

  const hemi = new THREE.HemisphereLight("#f3f3f3", "#030303", 0.65);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight("#ffffff", 1.15);
  dir.position.set(4, 10, 3);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.left = -30;
  dir.shadow.camera.right = 30;
  dir.shadow.camera.top = 30;
  dir.shadow.camera.bottom = -30;
  scene.add(dir);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: "#090909", roughness: 0.95, metalness: 0.05 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const gridHelper = new THREE.GridHelper(200, 100, "#1a1a1a", "#111111");
  scene.add(gridHelper);

  // pstate
  let yaw = 0;
  let pitch = 0;
  const playerPos = new THREE.Vector3(0, 0, 0);
  const playerHeight = 2.5;
  const moveSpeed = 7;

  // we can third person this shit later
  let bodyMat, detailMat, actorGlow;

  function buildActor() {
    const g = new THREE.Group();

    bodyMat = new THREE.MeshStandardMaterial({
      color: "#f8f8f8", roughness: 0.42, metalness: 0.06,
      emissive: "#ffffff", emissiveIntensity: 0.12, flatShading: true,
    });
    detailMat = new THREE.MeshStandardMaterial({
      color: "#dfdfdf", roughness: 0.48,
      emissive: "#ffffff", emissiveIntensity: 0.06, flatShading: true,
    });

    const part = (geo, mat, pos, rot) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(...pos);
      if (rot) m.rotation.set(...rot);
      m.castShadow = true;
      g.add(m);
    };

    part(new THREE.BoxGeometry(0.78, 0.34, 0.5), detailMat, [0, 1.02, 0]);
    part(new THREE.CylinderGeometry(0.34, 0.5, 1.15, 6, 1), bodyMat, [0, 1.64, 0]);
    part(new THREE.IcosahedronGeometry(0.35, 0), detailMat, [0, 2.55, 0]);
    part(new THREE.CylinderGeometry(0.1, 0.12, 0.72, 5, 1), detailMat, [-0.52, 1.88, 0], [0, 0, 0.15]);
    part(new THREE.CylinderGeometry(0.1, 0.12, 0.72, 5, 1), detailMat, [0.52, 1.88, 0], [0, 0, -0.3]);
    part(new THREE.CylinderGeometry(0.13, 0.16, 1.0, 5, 1), detailMat, [-0.2, 0.45, 0]);
    part(new THREE.CylinderGeometry(0.13, 0.16, 1.0, 5, 1), detailMat, [0.2, 0.45, 0]);

    actorGlow = new THREE.PointLight("#ffffff", 0.7, 10, 4);
    actorGlow.position.set(0, 1.62, 0.3);
    g.add(actorGlow);

    return g;
  }

  const actor = buildActor();
  scene.add(actor);

  // gun woo
  const fpGun = new THREE.Group();

  const gunBodyMat = new THREE.MeshStandardMaterial({ color: "#f5f5f5", metalness: 0.35, roughness: 0.4 });
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.5), gunBodyMat);
  gunBody.position.set(0.3, -0.2, -0.5);
  gunBody.castShadow = true;
  fpGun.add(gunBody);

  const gunBarrelMat = new THREE.MeshStandardMaterial({ color: "#b8b8b8", metalness: 0.55, roughness: 0.3 });
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 10), gunBarrelMat);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0.3, -0.18, -0.78);
  gunBarrel.castShadow = true;
  fpGun.add(gunBarrel);

  camera.add(fpGun);
  scene.add(camera);

  // race change
  watch(activeColor, (c) => {
    const p = actorPalette[c];
    if (!p) return;
    bodyMat.color.set(p.body);
    bodyMat.emissive.set(p.glow);
    bodyMat.emissiveIntensity = 0.15;
    detailMat.color.set(p.detail);
    detailMat.emissive.set(p.glow);
    detailMat.emissiveIntensity = 0.1;
    actorGlow.color.set(p.glow);
    gunBodyMat.color.set(p.body);
  }, { immediate: true });

  const targets = [];
  for (let i = 0; i < 12; i++) {
    const target = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshStandardMaterial({ color: "#ff7f7f", roughness: 0.35, metalness: 0.1 }),
    );
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 30;
    target.position.set(Math.cos(angle) * dist, 0.8 + Math.random() * 1.2, Math.sin(angle) * dist);
    target.castShadow = true;
    target.userData = {
      baseY: target.position.y,
      phase: Math.random() * Math.PI * 2,
      speed: 0.7 + Math.random() * 0.8,
    };
    targets.push(target);
    scene.add(target);
  }

  const bullets = [];
  const clock = new THREE.Clock();
  let shootCooldown = 0;
  let firing = false;
  let raf = 0;

  function respawnTarget(t) {
    const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 30;
    t.position.set(Math.cos(a) * d, 0.8 + Math.random() * 1.2, Math.sin(a) * d);
    t.material.color.setHSL(Math.random() * 0.08, 0.7, 0.62);
    t.userData = { baseY: t.position.y, phase: Math.random() * Math.PI * 2, speed: 0.7 + Math.random() * 0.8 };
  }

  function shoot() {
    const bp = bulletPalette[activeColor.value];
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      new THREE.MeshStandardMaterial({ color: bp.color, emissive: bp.emissive, emissiveIntensity: 0.8 }),
    );
    const sp = new THREE.Vector3(0.3, -0.18, -1.0);
    camera.localToWorld(sp);
    b.position.copy(sp);
    scene.add(b);

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
    bullets.push({ mesh: b, velocity: dir.multiplyScalar(40), ttl: 3.0 });
    shots.value += 1;
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const switchKeyMap = { "1": "red", "2": "yellow", "3": "blue", "4": "white" };

  const onKeyDown = (e) => {
    const sw = switchKeyMap[e.key];
    if (sw && !e.repeat) setColor(sw);
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = true;
  };

  const onKeyUp = (e) => {
    const k = e.key.toLowerCase();
    if (k in keys) keys[k] = false;
  };

  const onMouseMove = (e) => {
    if (!locked.value) return;
    yaw -= e.movementX * 0.002;
    pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, pitch - e.movementY * 0.002));
  };

  const onMouseDown = (e) => { if (locked.value && e.button === 0) firing = true; };
  const onMouseUp = (e) => { if (e.button === 0) firing = false; };

  const onPointerLockChange = () => {
    locked.value = document.pointerLockElement === canvasEl.value;
    if (!locked.value) firing = false;
  };

  function animate() {
    const dt = Math.min(clock.getDelta(), 0.033);

    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

    if (keys.w) playerPos.addScaledVector(forward, moveSpeed * dt);
    if (keys.s) playerPos.addScaledVector(forward, -moveSpeed * dt);
    if (keys.a) playerPos.addScaledVector(right, -moveSpeed * dt);
    if (keys.d) playerPos.addScaledVector(right, moveSpeed * dt);

    actor.position.set(playerPos.x, 0, playerPos.z);
    actor.rotation.y = yaw;

    camera.position.set(playerPos.x, playerPos.y + playerHeight, playerPos.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    dir.position.set(playerPos.x + 4, 10, playerPos.z + 3);
    dir.target.position.set(playerPos.x, 0, playerPos.z);
    dir.target.updateMatrixWorld();

    shootCooldown -= dt;
    if (firing && shootCooldown <= 0) {
      shootCooldown = 0.15;
      shoot();
    }

    for (const target of targets) {
      target.userData.phase += target.userData.speed * dt;
      target.position.y = target.userData.baseY + Math.sin(target.userData.phase) * 0.55;
      target.rotation.y += dt * (0.4 + target.userData.speed * 0.5);
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      bullet.ttl -= dt;
      bullet.mesh.position.addScaledVector(bullet.velocity, dt);

      let hit = false;
      for (const target of targets) {
        if (bullet.mesh.position.distanceTo(target.position) < 0.6) {
          score.value += 1;
          respawnTarget(target);
          hit = true;
          break;
        }
      }

      if (hit || bullet.ttl <= 0) {
        scene.remove(bullet.mesh);
        bullet.mesh.geometry.dispose();
        bullet.mesh.material.dispose();
        bullets.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }

  const dispose = (obj) => obj.traverse((n) => {
    if (!n.isMesh) return;
    n.geometry?.dispose();
    [].concat(n.material).forEach((m) => m?.dispose());
  });

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  resize();
  animate();

  cleanup = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("pointerlockchange", onPointerLockChange);

    for (const bullet of bullets) {
      scene.remove(bullet.mesh);
      bullet.mesh.geometry.dispose();
      bullet.mesh.material.dispose();
    }

    for (const target of targets) {
      scene.remove(target);
      target.geometry.dispose();
      target.material.dispose();
    }

    dispose(actor);
    dispose(fpGun);
    scene.remove(actor);
    scene.remove(ground);
    ground.geometry.dispose();
    ground.material.dispose();

    renderer.dispose();
  };
});

onBeforeUnmount(() => {
  cleanup();
});
</script>

