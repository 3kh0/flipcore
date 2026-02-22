import type * as THREE_NS from "three";
import { TUNNEL_RADIUS, BOX_COLORS } from "./constants";
import owoImage from "../assets/owo.jpg";
import tomatoImage from "../assets/tomato.jpg";

type THREE = typeof THREE_NS;

export interface TunnelState {
  center: THREE_NS.Vector3;
  dir: THREE_NS.Vector3;
}

export function lockheed(
  THREE: THREE,
  scene: THREE_NS.Scene,
  tunnel: TunnelState,
  pos: THREE_NS.Vector3,
) {
  const targets: THREE_NS.Mesh[] = [];
  const fxList: { mesh: THREE_NS.Mesh; life: number }[] = [];

  // spawn spacing state — keep next axial positions for each obstacle type
  const spawnState = {
    nextBoxAxial: 0,
    nextAsteroidAxial: 0,
    nextOwoAxial: 0,
    nextTomatoAxial: 0,
  };

  // function to reset spawn state (called on game reset)
  function resetSpawnState() {
    const playerAxial = new THREE.Vector3().subVectors(pos, tunnel.center).dot(tunnel.dir);
    spawnState.nextBoxAxial = playerAxial + 40 + Math.random() * 40;
    spawnState.nextAsteroidAxial = playerAxial + 60 + Math.random() * 60;
    spawnState.nextOwoAxial = playerAxial + 80 + Math.random() * 60;
    spawnState.nextTomatoAxial = playerAxial + 50 + Math.random() * 70;
  }

  function spawnBox(mesh?: THREE_NS.Mesh) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * TUNNEL_RADIUS * 0.6;
    const playerAxial = new THREE.Vector3().subVectors(pos, tunnel.center).dot(tunnel.dir);

    // if reusing an existing mesh (reset/respawn), place it a short distance ahead of the player
    if (mesh) {
      const axialForMesh = playerAxial + 20 + Math.random() * 30; // 20-50 ahead
      const sp = tunnel.center.clone().addScaledVector(tunnel.dir, axialForMesh);
      let p1 = new THREE.Vector3().crossVectors(tunnel.dir, new THREE.Vector3(0, 1, 0));
      if (p1.lengthSq() < 0.01) p1.crossVectors(tunnel.dir, new THREE.Vector3(1, 0, 0));
      p1.normalize();
      const p2 = new THREE.Vector3().crossVectors(tunnel.dir, p1).normalize();
      sp.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r);

      mesh.position.copy(sp);
      mesh.userData.baseY = sp.y;
      mesh.userData.phase = Math.random() * Math.PI * 2;
      mesh.userData.billboardMode = false;
      mesh.visible = true;
      try { mesh.frustumCulled = false; } catch (e) {}
      // advance spawn pointer so future boxes don't overlap immediately
      spawnState.nextBoxAxial = axialForMesh + 15 + Math.random() * 20;
      return mesh;
    }

    // existing flow for new box
    // initialize or advance nextBoxAxial so boxes are spaced out
    if (spawnState.nextBoxAxial <= playerAxial) {
      // bring boxes closer to player (initial 40-80 ahead)
      spawnState.nextBoxAxial = playerAxial + 40 + Math.random() * 40;
    }
    const axial = spawnState.nextBoxAxial;
    // schedule next box further ahead (gap 15-35)
    spawnState.nextBoxAxial = axial + 15 + Math.random() * 20;

    const sp = tunnel.center.clone().addScaledVector(tunnel.dir, axial);
    let p1 = new THREE.Vector3().crossVectors(tunnel.dir, new THREE.Vector3(0, 1, 0));
    if (p1.lengthSq() < 0.01) p1.crossVectors(tunnel.dir, new THREE.Vector3(1, 0, 0));
    p1.normalize();
    const p2 = new THREE.Vector3().crossVectors(tunnel.dir, p1).normalize();
    sp.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r);

    const c = BOX_COLORS[Math.floor(Math.random() * BOX_COLORS.length)];
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.4 }),
    );
    m.position.copy(sp);
    m.userData.phase = Math.random() * Math.PI * 2;
    m.userData.baseY = sp.y;
    const l = new THREE.PointLight(c, 0.4, 5);
    l.position.y = 0.5;
    m.add(l);
    scene.add(m);
    targets.push(m);
    return m;
  }

  function collectFX(p: THREE_NS.Vector3, color: string) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, wireframe: true }),
    );
    s.position.copy(p);
    scene.add(s);
    fxList.push({ mesh: s, life: 0.4 });
  }

  function updateFX(dt: number) {
    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i];
      f.life -= dt;
      const p = 1 - f.life / 0.4, s = 1 + p * 5;
      f.mesh.scale.setScalar(s);
      (f.mesh.material as THREE_NS.MeshBasicMaterial).opacity = 0.8 * (1 - p);
      if (f.life <= 0) {
        scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        (f.mesh.material as THREE_NS.Material).dispose();
        fxList.splice(i, 1);
      }
    }
  }


  const asteroids: THREE_NS.Mesh[] = [];

  function spawnAsteroid(mesh?: THREE_NS.Mesh) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * TUNNEL_RADIUS * 0.6;
    const playerAxial = new THREE.Vector3().subVectors(pos, tunnel.center).dot(tunnel.dir);

    // if reusing an existing asteroid, place it nearer the player instead of using far-ahead pointer
    if (mesh) {
      const axialForMesh = playerAxial + 40 + Math.random() * 40; // 40-80 ahead
      const sp = tunnel.center.clone().addScaledVector(tunnel.dir, axialForMesh);
      let p1 = new THREE.Vector3().crossVectors(tunnel.dir, new THREE.Vector3(0, 1, 0));
      if (p1.lengthSq() < 0.01) p1.crossVectors(tunnel.dir, new THREE.Vector3(1, 0, 0));
      p1.normalize();
      const p2 = new THREE.Vector3().crossVectors(tunnel.dir, p1).normalize();
      sp.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r);

      mesh.position.copy(sp);
      mesh.userData.baseY = sp.y;
      mesh.userData.phase = Math.random() * Math.PI * 2;
      mesh.visible = true;
      try { mesh.traverse((o: any) => { if (o.isMesh) { o.frustumCulled = false; o.visible = true; } }); } catch (e) {}
      spawnState.nextAsteroidAxial = axialForMesh + 25 + Math.random() * 35;
      return mesh;
    }

    // existing code for new asteroid follows
    if (spawnState.nextAsteroidAxial <= playerAxial) {
      spawnState.nextAsteroidAxial = playerAxial + 60 + Math.random() * 60; // initial 60-120
    }
    const axial = spawnState.nextAsteroidAxial;
    spawnState.nextAsteroidAxial = axial + 25 + Math.random() * 35;

    const sp = tunnel.center.clone().addScaledVector(tunnel.dir, axial);
    let p1 = new THREE.Vector3().crossVectors(tunnel.dir, new THREE.Vector3(0, 1, 0));
    if (p1.lengthSq() < 0.01) p1.crossVectors(tunnel.dir, new THREE.Vector3(1, 0, 0));
    p1.normalize();
    const p2 = new THREE.Vector3().crossVectors(tunnel.dir, p1).normalize();
    sp.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r);

    const size = 1.2 + Math.random() * 0.6;
    // Create a more detailed asteroid geometry with jagged edges
    const asteroidGeo = new THREE.IcosahedronGeometry(size, 4);
    const positions = asteroidGeo.attributes.position.array as Float32Array;

    // Add random jaggedness to vertices
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      const jag = 0.85 + Math.random() * 0.45; // Random scale between 0.85-1.3
      positions[i] = (x / len) * size * jag;
      positions[i + 1] = (y / len) * size * jag;
      positions[i + 2] = (z / len) * size * jag;
    }
    asteroidGeo.attributes.position.needsUpdate = true;
    asteroidGeo.computeVertexNormals();

    // Outer rocky shell material (brighter)
    const outerMat = new THREE.MeshStandardMaterial({
      color: "#e6c79a",
      emissive: "#b58f5a",
      emissiveIntensity: 0.9,
      roughness: 0.6,
      metalness: 0.18,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const outerMesh = new THREE.Mesh(asteroidGeo, outerMat);
    outerMesh.frustumCulled = false;
    outerMesh.renderOrder = 1;

    // Solid core - a larger, darker sphere to make the asteroid look dense and substantial
    const coreGeo = new THREE.SphereGeometry(size * 0.95, 16, 12);
    const coreMat = new THREE.MeshStandardMaterial({
      color: "#9b7f55",
      roughness: 0.9,
      metalness: 0.05,
      emissive: "#4b3f2b",
      emissiveIntensity: 0.25,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.frustumCulled = false;
    coreMesh.renderOrder = 1;

    // Group them so rotation/position works the same as before
    const group = new THREE.Group();
    coreMesh.position.set(0, 0, 0);
    outerMesh.position.set(0, 0, 0);
    group.add(coreMesh);
    group.add(outerMesh);

    // disable frustum culling and ensure render order so they reliably show
    group.frustumCulled = false;
    group.renderOrder = 1;
    group.traverse((o: any) => { if (o.isMesh) { o.frustumCulled = false; o.renderOrder = 1; } });

    // scale up for visibility (random small variation)
    const scale = 1.0 + Math.random() * 0.6;
    group.scale.setScalar(scale);
    group.visible = true;

    group.position.copy(sp);
    group.userData.phase = Math.random() * Math.PI * 2;
    group.userData.baseY = sp.y;
    const l = new THREE.PointLight("#ffd7a6", 1.2, 18);
    l.position.y = 0.5;
    group.add(l);
    scene.add(group);
    asteroids.push(group as unknown as THREE_NS.Mesh);
    return group as unknown as THREE_NS.Mesh;
  }

  const owoWhatAreThese: THREE_NS.Mesh[] = [];

  function spawnOwoWhatsThis(mesh?: THREE_NS.Mesh) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * TUNNEL_RADIUS * 0.6;
    const playerAxial = new THREE.Vector3().subVectors(pos, tunnel.center).dot(tunnel.dir);

    // reuse existing owo: place it relatively near player
    if (mesh) {
      const axialForMesh = playerAxial + 50 + Math.random() * 40; // 50-90 ahead
      const sp = tunnel.center.clone().addScaledVector(tunnel.dir, axialForMesh);
      let p1 = new THREE.Vector3().crossVectors(tunnel.dir, new THREE.Vector3(0, 1, 0));
      if (p1.lengthSq() < 0.01) p1.crossVectors(tunnel.dir, new THREE.Vector3(1, 0, 0));
      p1.normalize();
      const p2 = new THREE.Vector3().crossVectors(tunnel.dir, p1).normalize();
      sp.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r);

      mesh.position.copy(sp);
      mesh.userData.baseY = sp.y;
      mesh.userData.phase = Math.random() * Math.PI * 2;
      mesh.userData.billboardMode = true;
      mesh.visible = true;
      try { mesh.frustumCulled = false; } catch (e) {}
      spawnState.nextOwoAxial = axialForMesh + 40 + Math.random() * 50;
      return mesh;
    }

    if (spawnState.nextOwoAxial <= playerAxial) {
      spawnState.nextOwoAxial = playerAxial + 80 + Math.random() * 60; // initial 80-140
    }
    const axial = spawnState.nextOwoAxial;
    spawnState.nextOwoAxial = axial + 40 + Math.random() * 50; // gap 40-90

    const sp = tunnel.center.clone().addScaledVector(tunnel.dir, axial);
    let p1 = new THREE.Vector3().crossVectors(tunnel.dir, new THREE.Vector3(0, 1, 0));
    if (p1.lengthSq() < 0.01) p1.crossVectors(tunnel.dir, new THREE.Vector3(1, 0, 0));
    p1.normalize();
    const p2 = new THREE.Vector3().crossVectors(tunnel.dir, p1).normalize();
    sp.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r);

    const size = 1.2 + Math.random() * 0.6;
    const textureLoader = new THREE.TextureLoader();
    const m = new THREE.Mesh(
        new THREE.SphereGeometry(size, 32, 32),
        new THREE.MeshBasicMaterial({ color: "#cccccc", side: THREE.DoubleSide }),
    );
    // Load texture from imported asset
    textureLoader.load(
      owoImage,
      (texture) => {
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        try { texture.encoding = THREE.sRGBEncoding; } catch (e) { }
        (m.material as THREE_NS.MeshBasicMaterial).map = texture;
        (m.material as THREE_NS.MeshBasicMaterial).needsUpdate = true;
      }
    );
    m.position.copy(sp);
    m.userData.phase = Math.random() * Math.PI * 2;
    m.userData.baseY = sp.y;
    m.userData.billboardMode = true;
    m.frustumCulled = false;
    m.renderOrder = 2;
    const l = new THREE.PointLight("#ffffff", 2.2, 12);
    l.position.y = 0.5;
    m.add(l);
    scene.add(m);
    owoWhatAreThese.push(m);
    return m;
  }

  const tomatoes: THREE_NS.Mesh[] = [];

  function spawnTomato(mesh?: THREE_NS.Mesh) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * TUNNEL_RADIUS * 0.6;
    const playerAxial = new THREE.Vector3().subVectors(pos, tunnel.center).dot(tunnel.dir);

    // reuse existing tomato: place it relatively close ahead of player
    if (mesh) {
      const axialForMesh = playerAxial + 30 + Math.random() * 60; // 30-90 ahead
      const sp = tunnel.center.clone().addScaledVector(tunnel.dir, axialForMesh);
      let p1 = new THREE.Vector3().crossVectors(tunnel.dir, new THREE.Vector3(0, 1, 0));
      if (p1.lengthSq() < 0.01) p1.crossVectors(tunnel.dir, new THREE.Vector3(1, 0, 0));
      p1.normalize();
      const p2 = new THREE.Vector3().crossVectors(tunnel.dir, p1).normalize();
      sp.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r);

      mesh.position.copy(sp);
      mesh.userData.baseY = sp.y;
      mesh.userData.phase = Math.random() * Math.PI * 2;
      mesh.userData.billboardMode = true;
      mesh.visible = true;
      try { mesh.traverse((o: any) => { if (o.isMesh) { o.frustumCulled = false; o.visible = true; } }); } catch (e) {}
      spawnState.nextTomatoAxial = axialForMesh + 30 + Math.random() * 50;
      return mesh;
    }

    if (spawnState.nextTomatoAxial <= playerAxial) {
      spawnState.nextTomatoAxial = playerAxial + 50 + Math.random() * 70; // initial 50-120
    }
    const axial = spawnState.nextTomatoAxial;
    spawnState.nextTomatoAxial = axial + 30 + Math.random() * 50; // gap 30-80

    const sp = tunnel.center.clone().addScaledVector(tunnel.dir, axial);
    let p1 = new THREE.Vector3().crossVectors(tunnel.dir, new THREE.Vector3(0, 1, 0));
    if (p1.lengthSq() < 0.01) p1.crossVectors(tunnel.dir, new THREE.Vector3(1, 0, 0));
    p1.normalize();
    const p2 = new THREE.Vector3().crossVectors(tunnel.dir, p1).normalize();
    sp.addScaledVector(p1, Math.cos(a) * r).addScaledVector(p2, Math.sin(a) * r);

    const size = 1.2 + Math.random() * 0.6;
    const textureLoader = new THREE.TextureLoader();
    // Create tomato as a group so we can add a stem
    const tomatoGroup = new THREE.Group();

    // create a custom tomato geometry with subtle lobes and top indentation
    const sphereGeo = new THREE.SphereGeometry(size, 48, 32);
    const sPos = sphereGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < sPos.length; i += 3) {
      const x = sPos[i];
      const y = sPos[i + 1];
      const z = sPos[i + 2];
      const r = Math.sqrt(x * x + y * y + z * z) || 1;
      // angle around Y axis
      const phi = Math.atan2(z, x);
      // create 3 lobes around the tomato by modulating radius slightly
      const lobeFactor = 1 + 0.06 * Math.sin(3 * phi + (Math.random() - 0.5) * 0.2);
      // indentation near the top (where the stem sits)
      const topFactor = y > size * 0.4 ? 0.82 + (1 - (y / (size))) * 0.18 : 1.0;
      // apply modifications
      const newR = size * lobeFactor * topFactor;
      sPos[i] = (x / r) * newR;
      sPos[i + 1] = (y / r) * newR;
      sPos[i + 2] = (z / r) * newR;
    }
    sphereGeo.attributes.position.needsUpdate = true;
    sphereGeo.computeVertexNormals();

    // Use an unlit material so the texture is visible regardless of scene lighting
    const tomatoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    try { (tomatoMat as any).toneMapped = false; } catch (e) { }
    const sphere = new THREE.Mesh(sphereGeo, tomatoMat);
    sphere.frustumCulled = false;
    // slightly flatten to look more tomato-like
    sphere.scale.set(1.15, 0.95, 1.15);

    // Load texture onto sphere if available
    textureLoader.load(
      tomatoImage,
      (texture) => {
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        // ensure correct color space for display
        try { texture.encoding = THREE.sRGBEncoding; } catch (e) { /* ignore if encoding not available */ }
        tomatoMat.map = texture;
        tomatoMat.needsUpdate = true;
      }
    );

    // small green stem (cone)
    const stem = new THREE.Mesh(
      new THREE.ConeGeometry(size * 0.12, size * 0.25, 8),
      new THREE.MeshStandardMaterial({ color: "#2b7a19", roughness: 0.6, metalness: 0.02 }),
    );
    stem.position.set(0, size * 0.6, 0);
    stem.rotation.x = Math.PI; // point upward
    stem.rotateZ((Math.random() - 0.5) * 0.6);
    stem.frustumCulled = false;

    tomatoGroup.add(sphere);
    tomatoGroup.add(stem);

    // slightly increase tomato group scale so it's easier to see
    tomatoGroup.scale.setScalar(1.2 + Math.random() * 0.6);
    tomatoGroup.frustumCulled = false;
    tomatoGroup.renderOrder = 2;
    tomatoGroup.traverse((o: any) => { if (o.isMesh) { o.frustumCulled = false; o.renderOrder = 2; } });

    tomatoGroup.position.copy(sp);
    tomatoGroup.userData.phase = Math.random() * Math.PI * 2;
    tomatoGroup.userData.baseY = sp.y;
    tomatoGroup.userData.billboardMode = true;

    const l = new THREE.PointLight("#ff6644", 2.2, 12);
    l.position.y = 0.5;
    tomatoGroup.add(l);
    scene.add(tomatoGroup);
    tomatoes.push(tomatoGroup as unknown as THREE_NS.Mesh);
    return tomatoGroup as unknown as THREE_NS.Mesh;
  }

  return { targets, asteroids, owoWhatAreThese, tomatoes, fxList, spawnBox, spawnAsteroid, spawnOwoWhatsThis, spawnTomato, collectFX, updateFX, resetSpawnState };
}
