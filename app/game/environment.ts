import type * as THREE_NS from "three";
import { TUNNEL_RADIUS } from "./constants";

type THREE = typeof THREE_NS;

export function stars(THREE: THREE, scene: THREE_NS.Scene) {
  const starCount = 2500;
  const starGeo = new THREE.BufferGeometry();
  const starBuf = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    starBuf[i * 3] = (Math.random() - 0.5) * 400;
    starBuf[i * 3 + 1] = (Math.random() - 0.5) * 400;
    starBuf[i * 3 + 2] = (Math.random() - 0.5) * 400;
    starSizes[i] = 0.8 + Math.random() * 2.0;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starBuf, 3));
  starGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));

  const starMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color("#ffffff") } },
    vertexShader: `
      attribute float size;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.1, d);
        gl_FragColor = vec4(color, alpha * 0.9);
      }
    `,
    transparent: true,
    depthWrite: false,
  });

  const starPoints = new THREE.Points(starGeo, starMat);
  starPoints.frustumCulled = false;
  scene.add(starPoints);
  return { starGeo, starCount };
}

export function buildGrid(THREE: THREE, scene: THREE_NS.Scene) {
  const grid = new THREE.GridHelper(200, 80, "#0d0d18", "#080812");
  grid.position.y = -0.5;
  scene.add(grid);
  return grid;
}

export function buildRings(THREE: THREE, scene: THREE_NS.Scene) {
  const tunnelNormalColor = new THREE.Color("#1a3366");
  const tunnelWarnColor = new THREE.Color("#ff3344");
  const ringMat = new THREE.MeshBasicMaterial({ color: "#1a3366", transparent: true, opacity: 0.1, side: THREE.DoubleSide, fog: false });

  const tunnelRings: THREE_NS.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(TUNNEL_RADIUS, 0.12, 6, 32), ringMat);
    ring.position.set(0, 0, -(i + 1) * 8);
    scene.add(ring);
    tunnelRings.push(ring);
  }

  return { tunnelRings, ringMat, tunnelNormalColor, tunnelWarnColor };
}

export function buildTunnelWalls(THREE: THREE, scene: THREE_NS.Scene) {
  const railCount = 16;
  const length = 300;

  const wallMat = new THREE.LineBasicMaterial({
    color: "#1a3366",
    transparent: true,
    opacity: 0.08,
    fog: false,
  });

  const wallGroup = new THREE.Group();

  for (let i = 0; i < railCount; i++) {
    const angle = (i / railCount) * Math.PI * 2;
    const x = Math.cos(angle) * TUNNEL_RADIUS;
    const y = Math.sin(angle) * TUNNEL_RADIUS;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, length / 2),
      new THREE.Vector3(x, y, -length / 2),
    ]);
    wallGroup.add(new THREE.Line(geo, wallMat));
  }

  scene.add(wallGroup);
  return { wallGroup, wallMat };
}
