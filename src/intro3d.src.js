// 3D intro: a tiny snowy planet floating in space, with an elf making deliveries.
// Source file. The site loads the bundled/minified build at js/intro3d.js
// (rebuild with: npx esbuild src/intro3d.src.js --bundle --minify --format=esm --outfile=js/intro3d.js)
import * as THREE from "three";

const R = 5; // planet radius
const UP = new THREE.Vector3(0, 1, 0);
const rnd = (a, b) => a + Math.random() * (b - a);

// gentle lumps on the snow
const lump = (d) =>
  1 + 0.035 * Math.sin(d.x * 3.1 + 1.7) * Math.sin(d.y * 2.7 + 0.3) * Math.sin(d.z * 3.3 + 2.1) +
  0.02 * Math.sin(d.x * 7.3 + d.z * 5.1);
const surface = (dir) => R * lump(dir);

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.25, "rgba(255,255,255,.55)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function startIntro3D(host, { onEnter, sounds = {} } = {}) {
  const small = Math.min(innerWidth, innerHeight) < 700;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.prepend(renderer.domElement);
  renderer.domElement.className = "intro3d-canvas";

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1a2050, 20, 46);
  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 220);
  const BASE_Y = -1.9;           // planet sits a little low so the title has room
  const camHome = new THREE.Vector3();
  const lookHome = new THREE.Vector3(0, 1.4, 0);
  function frameCamera() {
    const aspect = innerWidth / innerHeight;
    const portrait = aspect < 0.8;
    camera.fov = portrait ? 46 : 34;
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // fit ~9.6 units vertically and ~7.4 units horizontally around the look point
    const d = Math.max((portrait ? 8.2 : 9.6) / tv, (portrait ? 6.4 : 7.4) / (tv * aspect));
    camHome.set(0, 1.4 + d * 0.16, d);
    camera.position.copy(camHome);
    camera.updateProjectionMatrix();
  }
  frameCamera();
  camera.lookAt(lookHome);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xbfd6ff, 0x3a3270, 1.25));
  const sun = new THREE.DirectionalLight(0xffe0b8, 2.1);
  sun.position.set(8, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 1.1);
  rim.position.set(-10, 4, -8);
  scene.add(rim);

  const glowTex = glowTexture();
  const glow = (color, size, opacity = 0.9) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size);
    return s;
  };

  // ---------- planet ----------
  const world = new THREE.Group();
  scene.add(world);
  const geo = new THREE.IcosahedronGeometry(R, 5);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  const colors = [];
  const cA = new THREE.Color(0xf6f9ff), cB = new THREE.Color(0xc9d8f5), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const r = surface(v);
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r);
    tmp.copy(cA).lerp(cB, THREE.MathUtils.clamp((lump(v) - 0.97) * 9, 0, 1));
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const planet = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
  planet.receiveShadow = true;
  world.add(planet);
  // soft atmosphere halo
  const halo = glow(0x9ec1ff, R * 3.6, 0.35);
  halo.position.y = -1.9;
  scene.add(halo);

  const placed = [];
  function place(obj, dir, spin = Math.random() * Math.PI * 2, sink = 0.05) {
    dir = dir.clone().normalize();
    obj.position.copy(dir).multiplyScalar(surface(dir) - sink);
    obj.quaternion.setFromUnitVectors(UP, dir);
    obj.rotateY(spin);
    obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    world.add(obj);
    placed.push(dir);
    return obj;
  }
  const farFrom = (dir, min) => placed.every((p) => p.angleTo(dir) > min);
  function randomDir(minPolar = 0.5, maxPolar = Math.PI - 0.15, spacing = 0.28) {
    for (let k = 0; k < 200; k++) {
      const th = rnd(minPolar, maxPolar), ph = rnd(0, Math.PI * 2);
      const d = new THREE.Vector3(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
      if (farFrom(d, spacing)) return d;
    }
    return null;
  }

  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...extra });
  const SNOW = mat(0xf4f8ff), BARK = mat(0x6b4423);

  // pine tree
  function pine(scale = 1, hue = 0x1f7a4a) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.35, 6), BARK);
    trunk.position.y = 0.17;
    g.add(trunk);
    const green = mat(hue);
    [[0.55, 0.62, 0.42], [0.45, 0.55, 0.78], [0.33, 0.48, 1.08]].forEach(([r, h, y]) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), green);
      c.position.y = y;
      g.add(c);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, h * 0.4, 7), SNOW);
      cap.position.y = y + h * 0.31;
      g.add(cap);
    });
    g.scale.setScalar(scale);
    return g;
  }

  // cozy house
  const WIN = new THREE.MeshBasicMaterial({ color: 0xffc966 });
  const windowGlows = [];
  function house(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.62, 0.75), mat(color));
    body.position.y = 0.31;
    g.add(body);
    const tri = (w, h) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.closePath(); return sh; };
    const roofGeo = (w, h, depth) => { const gg = new THREE.ExtrudeGeometry(tri(w, h), { depth, bevelEnabled: false }); gg.translate(0, 0, -depth / 2); return gg; };
    const roof = new THREE.Mesh(roofGeo(1.12, 0.5, 0.86), mat(0x6b2f3a));
    roof.position.y = 0.6;
    g.add(roof);
    const snowRoof = new THREE.Mesh(roofGeo(1.2, 0.56, 0.9), SNOW);
    snowRoof.scale.set(1, 1, 1);
    snowRoof.position.y = 0.66;
    const gable = new THREE.Mesh(roofGeo(1.02, 0.46, 0.92), mat(0x6b2f3a));
    gable.position.y = 0.6;
    g.add(snowRoof, gable);
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), mat(0x7a3b2a));
    chim.position.set(0.28, 1.0, 0.1);
    g.add(chim);
    [[-0.22, 0.36], [0.22, 0.36]].forEach(([x, y]) => {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), WIN);
      w.position.set(x, y, 0.376);
      g.add(w);
      const gl = glow(0xffb84d, 0.7, 0.75);
      gl.position.set(x, y, 0.45);
      g.add(gl);
      windowGlows.push(gl);
    });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.28), new THREE.MeshBasicMaterial({ color: 0x8a4b22 }));
    door.position.set(0, 0.14, 0.377);
    g.add(door);
    return g;
  }

  // present
  const GIFT_COLORS = [0xe3263f, 0x22c55e, 0x4cc9f0, 0xffd166, 0xc77dff];
  function present(color, s = 0.3) {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.8, s), mat(color));
    box.position.y = s * 0.4;
    g.add(box);
    const rib = mat(color === 0xffd166 ? 0xe3263f : 0xffd166, { metalness: 0.3, roughness: 0.4 });
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, s * 0.82, s * 0.18), rib);
    r1.position.y = s * 0.4;
    const r2 = r1.clone();
    r2.rotation.y = Math.PI / 2;
    const bow = new THREE.Mesh(new THREE.TorusGeometry(s * 0.16, s * 0.05, 6, 12), rib);
    bow.position.y = s * 0.88;
    g.add(r1, r2, bow);
    return g;
  }

  // the big Christmas tree at the top
  const bigTree = new THREE.Group();
  const lights = [];
  {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 8), BARK);
    trunk.position.y = 0.25;
    bigTree.add(trunk);
    const green = mat(0x177a42);
    const tiers = [[1.25, 1.2, 0.95], [1.0, 1.05, 1.6], [0.74, 0.92, 2.2], [0.46, 0.75, 2.72]];
    tiers.forEach(([r, h, y]) => {
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), green);
      c.position.y = y;
      bigTree.add(c);
      const rimSnow = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, 0.05, 5, 18), SNOW);
      rimSnow.rotation.x = Math.PI / 2;
      rimSnow.position.y = y - h / 2 + 0.06;
      bigTree.add(rimSnow);
    });
    const LC = [0xff4d6d, 0xffd166, 0x4cc9f0, 0x7cf29c, 0xff9f1c, 0xc77dff];
    for (let i = 0; i < 46; i++) {
      const t = i / 46;
      const y = 0.55 + t * 2.45;
      const rad = 1.18 * (1 - t * 0.86) + 0.04;
      const a = t * Math.PI * 9;
      const col = LC[i % LC.length];
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: col }));
      bulb.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
      const gl = glow(col, 0.42, 0.85);
      gl.position.copy(bulb.position);
      bigTree.add(bulb, gl);
      lights.push({ gl, ph: Math.random() * 6.28 });
    }
    const ornCols = [0xe3263f, 0xffd166, 0x4cc9f0, 0xc0c8d8];
    for (let i = 0; i < 16; i++) {
      const t = rnd(0.05, 0.85), a = rnd(0, Math.PI * 2);
      const y = 0.6 + t * 2.3, rad = 1.12 * (1 - t * 0.86);
      const o = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: ornCols[i % 4], metalness: 0.6, roughness: 0.2 }));
      o.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
      bigTree.add(o);
    }
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.11 : 0.26, a = Math.PI / 2 + (i * Math.PI) / 5;
      i ? starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: 0.06, bevelEnabled: false }), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
    star.position.set(0, 3.25, -0.03);
    bigTree.add(star);
    const starGlow = glow(0xffd166, 1.6, 0.95);
    starGlow.position.set(0, 3.25, 0.05);
    bigTree.add(starGlow);
    bigTree.userData = { star, starGlow };
    const tl = new THREE.PointLight(0xffc47a, 6, 6, 1.6);
    tl.position.set(0, 1.4, 0);
    bigTree.add(tl);
  }
  place(bigTree, UP.clone(), 0, 0.02);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd(-0.2, 0.2);
    const d = new THREE.Vector3(Math.cos(a) * 0.26, 1, Math.sin(a) * 0.26);
    const p = present(GIFT_COLORS[i % GIFT_COLORS.length], rnd(0.22, 0.34));
    p.position.copy(d.clone().normalize().multiplyScalar(surface(d.clone().normalize()) - 0.02));
    p.quaternion.setFromUnitVectors(UP, d.clone().normalize());
    p.rotateY(rnd(0, 6));
    p.traverse((m) => m.isMesh && (m.castShadow = true));
    world.add(p);
  }
  placed.push(new THREE.Vector3(0, 1, 0));

  // village + forest
  const houseColors = [0xc0392b, 0xd98e3a, 0x3f7fbf, 0x7a5a9a, 0x2f8f6a, 0xb5651d];
  const smokes = [];
  houseColors.forEach((c) => {
    const d = randomDir(0.55, 1.75, 0.55);
    if (!d) return;
    const h = place(house(c), d);
    for (let k = 0; k < 3; k++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.5 }));
      puff.position.set(0.28, 1.25, 0.1);
      h.add(puff);
      smokes.push({ m: puff, t: k / 3 });
    }
  });
  for (let i = 0; i < 46; i++) {
    const d = randomDir(0.42, Math.PI - 0.2, 0.22);
    if (!d) break;
    place(pine(rnd(0.55, 1.05), [0x1f7a4a, 0x17663d, 0x2a8a55][i % 3]), d);
  }
  // snowmen
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Group();
    [[0.22, 0.2], [0.16, 0.52], [0.11, 0.76]].forEach(([r, y]) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), SNOW);
      b.position.y = y;
      g.add(b);
    });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.14, 6), mat(0xff8c1a));
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.77, 0.15);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8), mat(0x1a1a1a));
    hat.position.y = 0.9;
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 12), mat(0xe3263f));
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.64;
    g.add(nose, hat, scarf);
    const d = randomDir(0.6, 1.6, 0.35);
    if (d) place(g, d);
  }

  // ---------- the elf courier ----------
  const elfPivot = new THREE.Group();
  world.add(elfPivot);
  const elf = new THREE.Group();
  const RED = mat(0xe3263f), GREEN = mat(0x1f9d55), SKIN = mat(0xffd3b0);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.2, 4, 8), GREEN);
  body.position.y = 0.36;
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.025, 5, 12), mat(0x1a1a1a));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.33;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), SKIN);
  head.position.y = 0.64;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 10), RED);
  hat.position.set(0, 0.86, -0.03);
  hat.rotation.x = -0.35;
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), SNOW);
  pom.position.set(0, 1.0, -0.1);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), SNOW);
  brim.rotation.x = Math.PI / 2;
  brim.position.y = 0.73;
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x1a0e05 });
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), eyeM);
  e1.position.set(-0.045, 0.66, 0.12);
  const e2 = e1.clone();
  e2.position.x = 0.045;
  const legGeo = new THREE.CapsuleGeometry(0.045, 0.12, 3, 6);
  const legL = new THREE.Mesh(legGeo, RED), legR = new THREE.Mesh(legGeo, RED);
  legL.position.set(-0.06, 0.12, 0);
  legR.position.set(0.06, 0.12, 0);
  const gift = present(0xe3263f, 0.22);
  gift.position.set(0, 0.42, 0.18);
  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 7), mat(0x8a5a2e));
  sack.scale.set(1, 1.15, 0.9);
  sack.position.set(0, 0.45, -0.17);
  elf.add(body, belt, head, hat, pom, brim, e1, e2, legL, legR, gift, sack);
  elf.traverse((m) => m.isMesh && (m.castShadow = true));
  const elfPolar = 0.62;
  const elfDir = new THREE.Vector3(Math.sin(elfPolar), Math.cos(elfPolar), 0);
  elf.position.copy(elfDir).multiplyScalar(surface(elfDir));
  elf.quaternion.setFromUnitVectors(UP, elfDir);
  elf.rotateY(Math.PI);
  elfPivot.add(elf);

  // ---------- falling snow + stars ----------
  const N = small ? 600 : 1300;
  const sPos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { sPos[i * 3] = rnd(-16, 16); sPos[i * 3 + 1] = rnd(-8, 14); sPos[i * 3 + 2] = rnd(-12, 12); }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  const flakes = new THREE.Points(snowGeo, new THREE.PointsMaterial({ map: glowTex, color: 0xffffff, size: 0.16, transparent: true, depthWrite: false, opacity: 0.9 }));
  scene.add(flakes);
  const starPos = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) {
    const d = new THREE.Vector3(rnd(-1, 1), rnd(-0.3, 1), rnd(-1, 0.2)).normalize().multiplyScalar(rnd(70, 110));
    starPos.set([d.x, d.y, d.z], i * 3);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ map: glowTex, color: 0xdfe8ff, size: 0.9, transparent: true, depthWrite: false, fog: false }));
  scene.add(stars);

  // ---------- interaction: drag to spin ----------
  let dragging = false, lastX = 0, lastY = 0, velY = 0.0025, tiltTarget = 0;
  const el = renderer.domElement;
  el.style.touchAction = "none";
  el.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId); sounds.grab?.(); });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    velY = (e.clientX - lastX) * 0.006;
    tiltTarget = THREE.MathUtils.clamp(tiltTarget + (e.clientY - lastY) * 0.004, -0.5, 0.35);
    lastX = e.clientX; lastY = e.clientY;
  });
  const up = () => (dragging = false);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);

  const onResize = () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    if (!entering) frameCamera(); else camera.updateProjectionMatrix();
  };
  addEventListener("resize", onResize);

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let entering = null, raf = 0, alive = true;
  const look = lookHome.clone();
  function frame() {
    if (!alive) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!dragging) velY += (0.0025 - velY) * 0.02;
    world.rotation.y += velY;
    world.rotation.x += (tiltTarget - world.rotation.x) * 0.08;
    if (!dragging) tiltTarget *= 0.995;
    world.position.y = BASE_Y + Math.sin(t * 0.6) * 0.12;

    elfPivot.rotation.y = -t * 0.32;
    const step = Math.sin(t * 9);
    legL.rotation.x = step * 0.6;
    legR.rotation.x = -step * 0.6;
    elf.children[0].position.y = 0.36 + Math.abs(step) * 0.03;
    head.position.y = 0.64 + Math.abs(step) * 0.03;

    lights.forEach((l) => (l.gl.material.opacity = 0.45 + 0.5 * (0.5 + 0.5 * Math.sin(t * 3 + l.ph))));
    bigTree.userData.star.rotation.y = t * 0.8;
    bigTree.userData.starGlow.scale.setScalar(1.5 + Math.sin(t * 2.4) * 0.2);
    windowGlows.forEach((g, i) => (g.material.opacity = 0.6 + 0.15 * Math.sin(t * 5 + i * 1.7) + 0.1 * Math.sin(t * 13 + i)));
    smokes.forEach((s) => {
      const k = (t * 0.25 + s.t) % 1;
      s.m.position.set(0.28 + k * 0.2, 1.22 + k * 0.9, 0.1);
      s.m.scale.setScalar(0.6 + k * 2.2);
      s.m.material.opacity = 0.55 * (1 - k);
    });
    const p = snowGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] -= dt * (0.6 + (i % 7) * 0.08);
      p[i * 3] += Math.sin(t + i) * dt * 0.15;
      if (p[i * 3 + 1] < -8) p[i * 3 + 1] = 14;
    }
    snowGeo.attributes.position.needsUpdate = true;
    stars.rotation.y = t * 0.004;

    if (entering) {
      const k = Math.min(1, (performance.now() - entering.start) / entering.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(entering.from, entering.to, e);
      look.lerpVectors(lookHome, entering.look, e);
      camera.fov = THREE.MathUtils.lerp(entering.fov, entering.fov * 0.8, e);
      camera.updateProjectionMatrix();
      if (k >= 1 && !entering.done) { entering.done = true; entering.cb?.(); }
    }
    camera.lookAt(look);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  frame();

  return {
    enter(cb) {
      if (entering) return;
      tiltTarget = 0;
      entering = { start: performance.now(), dur: 1800, from: camera.position.clone(), to: new THREE.Vector3(0, 4.6, 4.4), look: new THREE.Vector3(0, 4.9, 0), fov: camera.fov, cb };
    },
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      removeEventListener("resize", onResize);
      scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => { m.map?.dispose?.(); m.dispose(); }); });
      renderer.dispose();
      renderer.forceContextLoss?.();
      el.remove();
    },
  };
}
