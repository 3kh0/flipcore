import type * as THREE_NS from "three";

type THREE = typeof THREE_NS;

const ENG_CONFIG = {
  left:   { pos: [-0.7, 0, 0.3]  as const, fd: [-1, 0, 0] as const, col: "#ff5b5b", em: "#ff2222" },
  top:    { pos: [0, 0, -0.85]   as const, fd: [0, 0, -1]  as const, col: "#ffe28a", em: "#ffaa00" },
  right:  { pos: [0.7, 0, 0.3]  as const, fd: [1, 0, 0]   as const, col: "#87bbff", em: "#1b6dff" },
  bottom: { pos: [0, 0, 1.32]   as const, fd: [0, 0, 1]   as const, col: "#e8e8e8", em: "#cccccc" },
};

export interface EnginePart {
  flame: THREE_NS.Group;
  cone: THREE_NS.Mesh;
  outer: THREE_NS.Mesh;
}

export function nasa(THREE: THREE) {
  const rocket = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: "#dcdce8", emissive: "#334", emissiveIntensity: 0.3, metalness: 0.55, roughness: 0.35, flatShading: true });

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.48, 2.6, 8), bodyMat);
  fuselage.rotation.x = Math.PI / 2;
  rocket.add(fuselage);

  const noseMat = new THREE.MeshStandardMaterial({ color: "#ff3333", emissive: "#661111", emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.3, flatShading: true });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 8), noseMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -1.9;
  rocket.add(nose);

  const bellMat = new THREE.MeshStandardMaterial({ color: "#888", emissive: "#222", emissiveIntensity: 0.3, metalness: 0.7, roughness: 0.3, flatShading: true });
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.52, 0.5, 8, 1, true), bellMat);
  bell.rotation.x = Math.PI / 2;
  bell.position.z = 1.55;
  rocket.add(bell);

  const coreMat = new THREE.MeshStandardMaterial({
    color: "#66aaff", emissive: "#3355cc", emissiveIntensity: 1.0, metalness: 0.6, roughness: 0.25,
  });
  const coreStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.12, 8), coreMat);
  coreStripe.rotation.x = Math.PI / 2;
  coreStripe.position.z = -0.5;
  rocket.add(coreStripe);

  const coreLight = new THREE.PointLight("#4488ff", 1.2, 10);
  coreLight.position.set(0, 0.5, -0.5);
  rocket.add(coreLight);

  const finMat = new THREE.MeshStandardMaterial({ color: "#bbb", emissive: "#222", emissiveIntensity: 0.2, metalness: 0.5, roughness: 0.4, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.55), finMat);
    fin.position.set(Math.cos(a) * 0.52, Math.sin(a) * 0.52, 1.0);
    fin.rotation.z = a;
    rocket.add(fin);
  }

  // main exhaust
  const exhaustLen = 1.8;
  const exhaustCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, exhaustLen, 6),
    new THREE.MeshBasicMaterial({ color: "#4488ff", transparent: true, opacity: 0.7 }),
  );
  exhaustCone.rotation.x = Math.PI / 2;
  exhaustCone.position.z = 1.7 + exhaustLen / 2;

  const exhaustOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, exhaustLen * 1.3, 6),
    new THREE.MeshBasicMaterial({ color: "#2244aa", transparent: true, opacity: 0.2 }),
  );
  exhaustOuter.rotation.x = Math.PI / 2;
  exhaustOuter.position.z = 1.7 + exhaustLen * 0.65;

  const exh = new THREE.Group();
  exh.add(exhaustCone, exhaustOuter);
  const exhLight = new THREE.PointLight("#4488ff", 2.0, 12);
  exhLight.position.z = 2.0;
  exh.add(exhLight);
  rocket.add(exh);

  // direction thrusters
  const eParts: Record<string, EnginePart> = {};

  for (const [name, e] of Object.entries(ENG_CONFIG)) {
    const pod = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.18, 0.22),
      new THREE.MeshStandardMaterial({ color: e.col, metalness: 0.4, roughness: 0.35 }),
    );
    pod.position.set(...e.pos);
    rocket.add(pod);

    const strut = new THREE.Mesh(
      new THREE.BoxGeometry(e.fd[0] ? 0.25 : 0.05, 0.05, e.fd[2] ? 0.25 : 0.05),
      new THREE.MeshStandardMaterial({ color: "#777", metalness: 0.5, roughness: 0.4 }),
    );
    strut.position.set(e.pos[0] * 0.6, 0, e.pos[2] * 0.6);
    rocket.add(strut);

    const fg = new THREE.Group();
    fg.visible = false;
    fg.position.set(...e.pos);

    const fLen = 0.85;
    const fCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, fLen, 6),
      new THREE.MeshBasicMaterial({ color: e.em, transparent: true, opacity: 0.85 }),
    );
    if (e.fd[0] === -1) fCone.rotation.z = Math.PI / 2;
    else if (e.fd[0] === 1) fCone.rotation.z = -Math.PI / 2;
    else if (e.fd[2] === -1) fCone.rotation.x = -Math.PI / 2;
    else if (e.fd[2] === 1) fCone.rotation.x = Math.PI / 2;
    fCone.position.set(e.fd[0] * fLen / 2, 0, e.fd[2] * fLen / 2);
    fg.add(fCone);

    const oCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, fLen * 1.2, 6),
      new THREE.MeshBasicMaterial({ color: e.col, transparent: true, opacity: 0.25 }),
    );
    oCone.rotation.copy(fCone.rotation);
    oCone.position.copy(fCone.position);
    fg.add(oCone);

    const fLight = new THREE.PointLight(e.em, 1.0, 5);
    fLight.position.set(e.fd[0] * 0.6, 0, e.fd[2] * 0.6);
    fg.add(fLight);

    rocket.add(fg);
    eParts[name] = { flame: fg, cone: fCone, outer: oCone };
  }

  return { rocket, exhaustCone, exhaustOuter, coreMat, coreLight, eParts };
}
