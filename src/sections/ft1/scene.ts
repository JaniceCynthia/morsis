// FT-1 teardown scene (ADR 0003). The act's scroll progress opens the radio one
// Layer at a time: the housing parts, then each Layer's parts lift out and are named.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildInternals, type Internals } from "./parts";
import { splitByPlane } from "./split";
import { clamp, reduceMotion } from "../dom";

const MODEL = "/assets/models/ft1.glb";
/** When each Layer is on screen, matching the cue windows on the layer cards. */
const LAYER_WINDOWS: [number, number][] = [[0.2, 0.4], [0.38, 0.58], [0.56, 0.76], [0.68, 1.01]];

const ss = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const windowAmt = ([a, b]: [number, number], p: number) => ss(a - 0.03, a + 0.04, p) * (1 - ss(b - 0.04, b + 0.03, p));

export async function start(sec: HTMLElement, canvas: HTMLCanvasElement, tagsEl: HTMLElement) {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    sec.classList.add("no-gl");
    return;
  }
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.55;

  const key = new THREE.DirectionalLight(0xfff4e6, 2.7);
  key.position.set(0.4, 0.55, 0.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -0.35, right: 0.35, top: 0.35, bottom: -0.35, near: 0.05, far: 2.5 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.0015;
  key.shadow.radius = 3;
  // A low lime rim from behind: the brand's one colour, as light, not paint.
  const rim = new THREE.DirectionalLight(0xd4f53f, 0.9);
  rim.position.set(-0.5, 0.25, -0.45);
  const fill = new THREE.HemisphereLight(0xe8eadf, 0x0b0c09, 0.35);
  scene.add(key, key.target, rim, fill);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.005, 6);

  // ---- assemble ------------------------------------------------------------
  const gltf = await new GLTFLoader().loadAsync(MODEL);
  gltf.scene.updateMatrixWorld(true);
  const found: THREE.Mesh[] = [];
  gltf.scene.traverse((o) => (o as THREE.Mesh).isMesh && found.push(o as THREE.Mesh));
  // Bake every part into the radio's world frame so groups can move freely.
  const part = (name: string) => {
    const m = found.find((f) => f.name.toLowerCase().includes(name.toLowerCase()));
    if (!m) throw new Error(`FT-1 part ${name} missing`);
    m.geometry = m.geometry.clone().applyMatrix4(m.matrixWorld);
    m.position.set(0, 0, 0);
    m.quaternion.identity();
    m.scale.set(1, 1, 1);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const skin = found[0].material as THREE.MeshStandardMaterial;
  const opaque = skin.clone();
  opaque.transparent = false;
  opaque.depthWrite = true;
  opaque.side = THREE.DoubleSide;
  const glass = skin.clone();
  glass.transparent = true;
  glass.depthWrite = false;

  const base = part("RadioBase");
  const box = new THREE.Box3().setFromBufferAttribute(base.geometry.getAttribute("position") as THREE.BufferAttribute);
  const zMid = (box.min.z + box.max.z) / 2;
  const [frontGeo, backGeo] = splitByPlane(base.geometry, new THREE.Plane(new THREE.Vector3(0, 0, 1), -zMid));
  const shellOut = opaque.clone();
  shellOut.side = THREE.FrontSide;
  // The inside of the housing: bare moulded plastic, never seen until it opens.
  const shellIn = new THREE.MeshStandardMaterial({ color: 0x34342f, roughness: 0.82, side: THREE.BackSide });
  const shell = (geo: THREE.BufferGeometry) => {
    const g = new THREE.Group();
    for (const mat of [shellOut, shellIn]) {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }
    return g;
  };

  const asm = new THREE.Group();
  const groups = {
    front: new THREE.Group(),
    back: new THREE.Group(),
    antenna: new THREE.Group(),
    handle: new THREE.Group(),
    crank: new THREE.Group(),
  };
  groups.front.add(shell(frontGeo));
  groups.back.add(shell(backGeo));
  for (const [name, mat, g] of [
    ["Visor", glass, groups.front], ["Sphere", opaque, groups.front], ["Cube", opaque, groups.front], ["buttons", opaque, groups.front],
    ["antena", opaque, groups.antenna], ["stripe", opaque, groups.handle], ["Generator", opaque, groups.crank],
  ] as const) {
    const m = part(name);
    m.material = mat;
    g.add(m);
  }
  const inside: Internals = buildInternals();
  const movers: Record<string, THREE.Object3D> = {
    ...groups,
    mic: inside.mic, ferrite: inside.ferrite, pcb: inside.pcb, decode: inside.decode,
    card: inside.card, speaker: inside.speaker, dynamo: inside.dynamo, cells: inside.cells,
  };
  const home = new Map<THREE.Object3D, THREE.Vector3>();
  for (const o of Object.values(movers)) {
    asm.add(o);
    home.set(o, o.position.clone());
  }
  const centre = new THREE.Box3().setFromObject(groups.back).union(new THREE.Box3().setFromObject(groups.front)).getCenter(new THREE.Vector3());
  asm.position.copy(centre).negate();
  const rig = new THREE.Group();
  rig.add(asm);
  scene.add(rig);
  sec.classList.add("has-gl");

  // ---- tags ----------------------------------------------------------------
  const tagEls = inside.tags.map((t) => {
    const el = document.createElement("div");
    el.className = "ft1-tag";
    el.innerHTML = `<i></i><span>${t.label}</span>`;
    tagsEl.appendChild(el);
    return el;
  });

  // ---- choreography ----------------------------------------------------------
  const offsets = (p: number) => {
    const L = ss(0.12, 0.34, p), S = ss(0.36, 0.54, p), Mn = ss(0.54, 0.7, p), E = ss(0.66, 0.86, p);
    return {
      front: [0, 0.008 * L, 0.11 * L + 0.075 * S],
      mic: [0, 0.012 * L, 0.045 * L + 0.02 * S],
      ferrite: [0, 0.034 * L, -0.008 * L],
      antenna: [0, 0.05 * L, 0],
      handle: [0, 0.03 * L, 0],
      speaker: [0, -0.004 * S, 0.08 * S],
      pcb: [0, 0, 0.02 * S],
      decode: [0, 0, 0.02 * S + 0.042 * Mn],
      card: [0.048 * Mn, 0, 0.02 * S + 0.012 * Mn],
      cells: [0, -0.03 * E, -0.055 * E],
      dynamo: [-0.04 * E, 0, -0.012 * E],
      crank: [-0.078 * E, 0, 0],
      back: [0, 0, -0.125 * E],
    } as Record<string, [number, number, number]>;
  };

  let W = 0, H = 0;
  const resize = () => {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    // On wide screens the copy owns the right side, so the radio sits left of centre.
    if (W > 860) camera.setViewOffset(W, H, W * 0.11, 0, W, H);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    dirty = true;
  };
  new ResizeObserver(resize).observe(canvas);

  const still = reduceMotion();
  let pCur = -1;
  let dirty = true;
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  const tmp = new THREE.Vector3();
  const t0 = performance.now();

  const frame = (now: number) => {
    requestAnimationFrame(frame);
    if (!visible || !W) return;
    const pTarget = parseFloat(getComputedStyle(sec).getPropertyValue("--sc-p")) || 0;
    const settled = Math.abs(pTarget - pCur) < 0.0005;
    if (settled && !dirty && still) return;
    pCur = pCur < 0 || still ? pTarget : pCur + (pTarget - pCur) * 0.14;
    dirty = false;
    const p = pCur;

    const off = offsets(p);
    for (const [k, o] of Object.entries(movers)) {
      const d = off[k] || [0, 0, 0];
      o.position.copy(home.get(o)!).add(tmp.set(d[0], d[1], d[2]));
    }
    // The camera opens on a front three-quarter view, then swings toward the
    // side as the housing parts, so the Layers spread across the screen like
    // an exploded diagram; it pulls back as the spread grows.
    const swing = ss(0.08, 0.34, p);
    const spread = ss(0.3, 0.9, p);
    const az = THREE.MathUtils.degToRad(lerp(24, 60, swing) + 6 * spread);
    const el = THREE.MathUtils.degToRad(lerp(9, 15, swing) + 4 * spread);
    const portrait = H > W;
    const dist = (lerp(0.66, 0.74, swing) + 0.14 * spread) * (portrait ? 1.75 : 1);
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist + 0.01, Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(0, portrait ? -0.03 : 0.018, lerp(0, -0.01, spread));
    // A slow sway so the object feels held, not rendered.
    rig.rotation.y = still ? 0 : Math.sin((now - t0) / 4200) * 0.035;
    key.position.set(0.4, 0.55, 0.5);

    LAYER_WINDOWS.forEach((w, i) => {
      const a = windowAmt(w, p);
      inside.leds[i].forEach((m) => (m.emissiveIntensity = 0.15 + a * 2.4));
    });
    renderer.render(scene, camera);

    rig.updateMatrixWorld();
    inside.tags.forEach((tag, i) => {
      const a = windowAmt(LAYER_WINDOWS[tag.layer], p);
      const el = tagEls[i];
      el.style.opacity = a.toFixed(3);
      if (a < 0.01) return;
      tag.obj.localToWorld(tmp.copy(tag.at)).project(camera);
      const x = ((tmp.x + 1) / 2) * W;
      // Labels on the right half point left, so none runs off a narrow screen.
      const left = x > W * 0.55;
      el.classList.toggle("is-left", left);
      el.style.transform = `translate(${x}px, ${((1 - tmp.y) / 2) * H}px)${left ? " translateX(-100%)" : ""}`;
    });
  };
  resize();
  requestAnimationFrame(frame);
  // Debug handle for visual checks in dev.
  if (import.meta.env.DEV) (window as unknown as { ft1: unknown }).ft1 = { scene, camera, renderer, rig, movers };
}
