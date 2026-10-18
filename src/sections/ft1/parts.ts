// The FT-1's internals, built to sit inside the radio shell. The source model is
// shell only, so every part a Layer reveals is modelled here. Units are metres
// in the radio's own frame: +y up, +z out of the front face.
import * as THREE from "three";
import { boardTexture, brushedLid, cardLabel, cellWrap, chipTop, conePaper, type Footprint } from "./textures";

export type LayerIndex = 0 | 1 | 2 | 3; // Listen, Segment, Map meaning, Emit

export interface Tag {
  layer: LayerIndex;
  label: string;
  obj: THREE.Object3D;
  /** Anchor point in obj's local space. */
  at: THREE.Vector3;
}

export interface Internals {
  mic: THREE.Group;
  ferrite: THREE.Group;
  pcb: THREE.Group;
  decode: THREE.Group;
  card: THREE.Group;
  speaker: THREE.Group;
  dynamo: THREE.Group;
  cells: THREE.Group;
  /** Status LEDs, one set per Layer, lit while that Layer is on screen. */
  leds: THREE.MeshStandardMaterial[][];
  tags: Tag[];
}

const mm = (v: number) => v / 1000;

const std = (color: number, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

const M = {
  black: std(0x1b1b18, 0.62),
  blackGloss: std(0x121210, 0.32),
  steel: std(0x8d8e88, 0.36, 1),
  darkSteel: std(0x3c3d39, 0.42, 1),
  tin: std(0xb6b7af, 0.3, 1),
  brass: std(0xb08d45, 0.34, 1),
  copper: std(0xb4693c, 0.33, 1),
  alu: std(0xc8c9c3, 0.26, 1),
  ivory: std(0xe6e1d3, 0.55),
  rubber: std(0x151513, 0.88),
  wireRed: std(0x9e2a22, 0.5),
  wireBlack: std(0x161614, 0.5),
  wireWhite: std(0xd9d6cc, 0.5),
};

function led(): THREE.MeshStandardMaterial {
  return std(0x2c3315, 0.4, 0, { emissive: new THREE.Color(0xd4f53f), emissiveIntensity: 0 });
}

function box(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(mm(w), mm(h), mm(d)), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function cyl(r: number, len: number, mat: THREE.Material | THREE.Material[], seg = 32, axis: "x" | "y" | "z" = "y") {
  const g = new THREE.CylinderGeometry(mm(r), mm(r), mm(len), seg, 1);
  if (axis === "x") g.rotateZ(Math.PI / 2);
  if (axis === "z") g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** A short dangling lead: two or three wires bundled into a connector. */
function lead(from: THREE.Vector3, dir: THREE.Vector3, mats: THREE.Material[]) {
  const g = new THREE.Group();
  mats.forEach((mat, i) => {
    const off = new THREE.Vector3(0, mm((i - (mats.length - 1) / 2) * 1.8), 0);
    const pts = [0, 0.35, 0.7, 1].map((t) =>
      from.clone().add(off).add(dir.clone().multiplyScalar(mm(26) * t)).add(new THREE.Vector3(0, -Math.sin(t * Math.PI) * mm(5), 0)),
    );
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, mm(0.75), 8), mat);
    tube.castShadow = true;
    g.add(tube);
  });
  const plug = box(5, mats.length * 2 + 2, 4, M.ivory);
  plug.position.copy(from).add(dir.clone().multiplyScalar(mm(28)));
  g.add(plug);
  return g;
}

// ------------------------------------------------------------------ main board
const PCB = { w: 150, h: 128, t: 1.6 };
const PCB_AT = new THREE.Vector3(0.008, -0.03, 0.066);

const FOOT: Footprint[] = [
  { x: -18, y: 14, w: 16, h: 16, ref: "U1 DSP" },
  { x: -48, y: 40, w: 38, h: 26, ref: "RF" },
  { x: 40, y: 6, w: 46, h: 38, ref: "J7 DECODE-3" },
  { x: 2, y: 34, w: 11, h: 4.5, ref: "Y1" },
  { x: -2, y: -12, w: 5, h: 4, ref: "U4" },
  { x: 12, y: -12, w: 5, h: 4, ref: "U5" },
  { x: -36, y: 0, w: 6, h: 5, ref: "U3" },
  { x: -28, y: -38, w: 6, h: 6, ref: "L3" },
  { x: -18, y: -48, w: 6, h: 6, ref: "L4" },
  { x: 58, y: -40, w: 26, h: 24, ref: "J9 LOG" },
  { x: 66, y: 52, w: 10, h: 5, ref: "J2" },
  { x: -66, y: 52, w: 10, h: 5, ref: "J1" },
  { x: 30, y: -52, w: 10, h: 5, ref: "J3" },
];

function mainBoard(leds: THREE.MeshStandardMaterial[][]) {
  const g = new THREE.Group();
  const { map, rough } = boardTexture({
    w: PCB.w, h: PCB.h, ppm: 7, seed: 11,
    mask: "#1C3A2B", trace: "#28553C",
    title: ["MORSIS FT-1", "DSP-3 MAIN · REV C", "FIELD SERVICE ONLY · 2026"],
    foot: FOOT,
  });
  const top = new THREE.MeshStandardMaterial({ map, roughnessMap: rough, metalnessMap: rough, roughness: 1, metalness: 1 });
  const edge = std(0x1a2a1f, 0.6);
  const board = box(PCB.w, PCB.h, PCB.t, [edge, edge, edge, edge, top, edge]);
  g.add(board);
  const onTop = (m: THREE.Object3D, x: number, y: number, h: number) => {
    m.position.set(mm(x), mm(y), mm(PCB.t / 2 + h / 2));
    g.add(m);
    return m;
  };
  // DSP: a QFP with a marked top.
  const dsp = box(16, 16, 1.6, [M.black, M.black, M.black, M.black, new THREE.MeshStandardMaterial({ map: chipTop(["MRS-DSP3", "2614 · A2"], 3), roughness: 0.55 }), M.black]);
  onTop(dsp, -18, 14, 1.6);
  // RF section under a tin shield can, the way a real receiver is built.
  const can = box(38, 26, 4.5, M.tin);
  onTop(can, -48, 40, 4.5);
  for (let i = 0; i < 9; i++) {
    const hole = cyl(0.9, 0.2, M.darkSteel, 10, "z");
    hole.position.set(mm(-62 + i * 3.6), mm(40 + (i % 2 ? 4 : -4)), mm(PCB.t / 2 + 4.6));
    g.add(hole);
  }
  // Mezzanine header the Decode-3 module plugs into.
  onTop(box(30, 4, 3, M.blackGloss), 40, -9, 3);
  // Crystal, small ICs and inductors.
  onTop(box(11, 4.5, 3.6, M.alu), 2, 34, 3.6);
  for (const [x, y] of [[-2, -12], [12, -12], [-36, 0]]) onTop(box(5, 4, 1.4, [M.black, M.black, M.black, M.black, new THREE.MeshStandardMaterial({ map: chipTop(["MRS"], x + 50), roughness: 0.55 }), M.black]), x, y, 1.4);
  for (const [x, y] of [[-28, -38], [-18, -48]]) onTop(box(6, 6, 3.4, M.darkSteel), x, y, 3.4);
  // Electrolytic capacitors: aluminium cans with a vent cross, sleeve on the side.
  const sleeve = std(0x23271f, 0.45);
  for (const [x, y, r, h] of [[8, -34, 3, 8], [16, -34, 3, 8], [-62, -4, 4, 10], [-50, -4, 4, 10], [-66, -50, 5, 12]]) {
    const c = cyl(r, h, [sleeve, M.alu, M.alu], 24, "z");
    onTop(c, x, y, h);
  }
  // Connectors.
  for (const [x, y] of [[66, 52], [-66, 52], [30, -52]]) onTop(box(10, 5, 5, M.ivory), x, y, 5);
  // Status LEDs: Listen and Segment report here.
  [[-70, 8], [-70, 2]].forEach(([x, y], i) => {
    const mat = led();
    leds[i].push(mat);
    onTop(box(1.6, 1, 0.8, mat), x, y, 0.8);
  });
  // Standoffs at the corners.
  for (const [mx, my] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const s = cyl(2.4, 8, M.brass, 6, "z");
    s.position.set(mm(mx * (PCB.w / 2 - 4)), mm(my * (PCB.h / 2 - 4)), mm(-PCB.t / 2 - 4));
    g.add(s);
  }
  g.position.copy(PCB_AT);
  return g;
}

// ------------------------------------------------------------- Decode-3 module
function decodeModule(leds: THREE.MeshStandardMaterial[]) {
  const g = new THREE.Group();
  const { map, rough } = boardTexture({
    w: 46, h: 38, ppm: 14, seed: 23, mask: "#121310", trace: "#1F211B",
    title: ["DECODE-3", "CO-PROCESSOR · MRS-D3"], foot: [{ x: 0, y: 4, w: 24, h: 24, ref: "U1" }],
  });
  const top = new THREE.MeshStandardMaterial({ map, roughnessMap: rough, metalnessMap: rough, roughness: 1, metalness: 1 });
  const edge = std(0x141511, 0.6);
  g.add(box(46, 38, 1.2, [edge, edge, edge, edge, top, edge]));
  const lid = brushedLid(["DECODE-3", "MORSIS · MRS-D3", "HYPOTHESIS ENGINE"], 5);
  const lidMat = new THREE.MeshStandardMaterial({ map: lid.map, roughnessMap: lid.rough, metalnessMap: lid.rough, roughness: 1, metalness: 1 });
  const chip = box(24, 24, 2.2, [M.alu, M.alu, M.alu, M.alu, lidMat, M.alu]);
  chip.position.set(0, mm(4), mm(0.6 + 1.1));
  g.add(chip);
  const mat = led();
  leds.push(mat);
  const l = box(1.6, 1, 0.8, mat);
  l.position.set(mm(19), mm(-15), mm(1));
  g.add(l);
  // Its half of the mezzanine connector, on the underside.
  const plug = box(30, 4, 2.4, M.blackGloss);
  plug.position.set(0, mm(-15), mm(-1.8));
  g.add(plug);
  // Sits on the main board's J7 footprint, on standoffs.
  g.position.copy(PCB_AT).add(new THREE.Vector3(mm(40), mm(6), mm(PCB.t / 2 + 6)));
  return g;
}

function fieldCard() {
  const g = new THREE.Group();
  const lab = new THREE.MeshStandardMaterial({ map: cardLabel(), roughness: 0.5 });
  g.add(box(24, 32, 1.1, [M.blackGloss, M.blackGloss, M.blackGloss, M.blackGloss, lab, M.blackGloss]));
  // In the J9 slot near the board's right edge, label facing out.
  g.position.copy(PCB_AT).add(new THREE.Vector3(mm(58), mm(-40), mm(PCB.t / 2 + 2.4)));
  const slot = box(26, 24, 2.6, M.steel);
  slot.position.set(0, mm(4), mm(-0.9));
  g.add(slot);
  return g;
}

// ---------------------------------------------------------------- Listen parts
function micArray(leds: THREE.MeshStandardMaterial[]) {
  const g = new THREE.Group();
  const { map, rough } = boardTexture({
    w: 34, h: 34, ppm: 14, seed: 41, mask: "#121310", trace: "#1E2019",
    title: ["HYD-6"], foot: [],
  });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(mm(17), mm(17), mm(1.4), 48).rotateX(Math.PI / 2), [
    std(0x141511, 0.6), new THREE.MeshStandardMaterial({ map, roughnessMap: rough, metalnessMap: rough, roughness: 1, metalness: 1 }), std(0x141511, 0.6),
  ]);
  disc.castShadow = disc.receiveShadow = true;
  g.add(disc);
  const grille = std(0x7d7e78, 0.5, 1, { wireframe: false });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cap = new THREE.Group();
    cap.add(cyl(3.1, 5, [M.steel, grille, M.steel], 24, "z"));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(mm(3.1), mm(0.4), 8, 24), M.brass);
    ring.position.z = mm(2.5);
    cap.add(ring);
    cap.position.set(mm(Math.cos(a) * 10), mm(Math.sin(a) * 10), mm(3.2));
    g.add(cap);
  }
  const centre = cyl(2.2, 3, M.darkSteel, 20, "z");
  centre.position.z = mm(2.2);
  g.add(centre);
  const mat = led();
  leds.push(mat);
  const l = box(1.4, 1, 0.8, mat);
  l.position.set(mm(12), mm(-12), mm(1.1));
  g.add(l);
  g.add(lead(new THREE.Vector3(0, mm(-17), 0), new THREE.Vector3(0.2, -1, -0.6).normalize(), [M.wireWhite, M.wireBlack]));
  g.position.set(-0.054, 0.057, 0.084);
  return g;
}

function ferriteAntenna() {
  const g = new THREE.Group();
  g.add(cyl(4, 96, std(0x2b2b28, 0.7, 0.2), 24, "x"));
  // Litz winding: a tight copper helix over the middle of the rod.
  const turns = 46, len = mm(52), rad = mm(4.7);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= turns * 16; i++) {
    const t = i / (turns * 16);
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(-len / 2 + t * len, Math.cos(a) * rad, Math.sin(a) * rad));
  }
  const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 16, mm(0.55), 6), M.copper);
  coil.castShadow = true;
  g.add(coil);
  for (const x of [-40, 40]) {
    const clip = box(6, 10, 10, M.blackGloss);
    clip.position.x = mm(x);
    g.add(clip);
  }
  g.position.set(-0.004, 0.084, 0.052);
  return g;
}

// ------------------------------------------------------------------ Emit parts
function speakerDriver() {
  const g = new THREE.Group();
  const R = 34;
  // Cone: a lathe profile from the voice coil out to the surround.
  const prof = [
    new THREE.Vector2(mm(9), mm(-11)), new THREE.Vector2(mm(14), mm(-8)), new THREE.Vector2(mm(22), mm(-4)),
    new THREE.Vector2(mm(29), mm(-0.5)), new THREE.Vector2(mm(R - 4), mm(0)),
  ];
  const coneGeo = new THREE.LatheGeometry(prof, 64).rotateX(Math.PI / 2);
  const cone = new THREE.Mesh(coneGeo, new THREE.MeshStandardMaterial({ map: conePaper(9), roughness: 0.92, side: THREE.DoubleSide }));
  cone.castShadow = cone.receiveShadow = true;
  g.add(cone);
  const surround = new THREE.Mesh(new THREE.TorusGeometry(mm(R - 2.5), mm(2.2), 12, 64, Math.PI * 2), M.rubber);
  surround.scale.z = 0.6;
  g.add(surround);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(mm(10), 32, 16, 0, Math.PI * 2, 0, Math.PI / 3.2).rotateX(Math.PI / 2), std(0x1c1c19, 0.6));
  cap.position.z = mm(-16);
  g.add(cap);
  // Pressed-steel basket: rim ring and four struts back to the motor.
  const rim = new THREE.Mesh(new THREE.TorusGeometry(mm(R), mm(1.3), 8, 64), M.darkSteel);
  g.add(rim);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const strut = box(3, 26, 1.2, M.darkSteel);
    strut.position.set(Math.cos(a) * mm(22), Math.sin(a) * mm(22), mm(-9));
    strut.lookAt(new THREE.Vector3(0, 0, mm(-18)));
    g.add(strut);
  }
  const plate = cyl(15, 3, M.steel, 40, "z");
  plate.position.z = mm(-19);
  g.add(plate);
  const magnet = cyl(14, 8, std(0x2e2f2b, 0.55, 0.3), 40, "z");
  magnet.position.z = mm(-24.5);
  g.add(magnet);
  const back = cyl(15, 2, M.steel, 40, "z");
  back.position.z = mm(-29.5);
  g.add(back);
  g.add(lead(new THREE.Vector3(mm(15), 0, mm(-24)), new THREE.Vector3(1, -0.4, -0.3).normalize(), [M.wireRed, M.wireBlack]));
  // Shallow enough that the motor clears the board behind it.
  g.scale.z = 0.85;
  g.position.set(-0.045, -0.06, 0.095);
  return g;
}

function crankDynamo() {
  const g = new THREE.Group();
  g.add(cyl(12.5, 24, [M.steel, M.darkSteel, M.darkSteel], 40, "x"));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(mm(12.9), mm(12.9), mm(9), 40, 1, true).rotateZ(Math.PI / 2), M.copper);
  g.add(band);
  // Spur gear on the crank side.
  const teeth = 28, ro = mm(15), ri = mm(13.4);
  const s = new THREE.Shape();
  for (let i = 0; i < teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 ? ri : ro;
    const a2 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    s.lineTo(Math.cos(a2) * r, Math.sin(a2) * r);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, mm(2.5), 0, Math.PI * 2, true);
  s.holes.push(hole);
  const gear = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: mm(3), bevelEnabled: false }).rotateY(Math.PI / 2), M.brass);
  gear.position.x = mm(-16);
  gear.castShadow = true;
  g.add(gear);
  const shaft = cyl(2.4, 34, M.alu, 16, "x");
  shaft.position.x = mm(-4);
  g.add(shaft);
  g.add(lead(new THREE.Vector3(mm(12), mm(8), 0), new THREE.Vector3(1, 0.2, 0.2).normalize(), [M.wireRed, M.wireBlack]));
  g.position.set(-0.082, 0.026, 0.056);
  return g;
}

function cellPack(leds: THREE.MeshStandardMaterial[]) {
  const g = new THREE.Group();
  const holder = box(70, 40, 10, std(0x1a1a17, 0.7));
  holder.position.z = mm(-4);
  g.add(holder);
  const wrap = new THREE.MeshStandardMaterial({ map: cellWrap(4), roughness: 0.4 });
  for (const y of [-9.5, 9.5]) {
    const c = cyl(9, 65, [wrap, M.alu, M.alu], 40, "x");
    c.position.set(0, mm(y), mm(5));
    g.add(c);
  }
  for (const x of [-35, 35]) {
    const tab = box(1, 36, 12, M.tin);
    tab.position.set(mm(x), 0, mm(4));
    g.add(tab);
  }
  const mat = led();
  leds.push(mat);
  const l = box(1.4, 1, 0.8, mat);
  l.position.set(mm(30), mm(-18), mm(1.4));
  g.add(l);
  g.add(lead(new THREE.Vector3(mm(35), mm(10), mm(4)), new THREE.Vector3(0.6, 1, 0.4).normalize(), [M.wireRed, M.wireBlack]));
  g.position.set(0.034, -0.076, 0.05);
  return g;
}

export function buildInternals(): Internals {
  const leds: THREE.MeshStandardMaterial[][] = [[], [], [], []];
  const pcb = mainBoard(leds);
  const it: Internals = {
    mic: micArray(leds[0]),
    ferrite: ferriteAntenna(),
    pcb,
    decode: decodeModule(leds[2]),
    card: fieldCard(),
    speaker: speakerDriver(),
    dynamo: crankDynamo(),
    cells: cellPack(leds[3]),
    leds,
    tags: [],
  };
  it.tags = [
    { layer: 0, label: "Hydrophone and mic array", obj: it.mic, at: new THREE.Vector3(0, mm(14), mm(6)) },
    { layer: 0, label: "Ferrite loop antenna", obj: it.ferrite, at: new THREE.Vector3(mm(20), mm(6), 0) },
    { layer: 1, label: "DSP-3 signal board", obj: it.pcb, at: new THREE.Vector3(mm(-18), mm(14), mm(3)) },
    { layer: 1, label: "Shielded RF front end", obj: it.pcb, at: new THREE.Vector3(mm(-48), mm(40), mm(6)) },
    { layer: 2, label: "Decode-3 co-processor", obj: it.decode, at: new THREE.Vector3(0, mm(4), mm(3)) },
    { layer: 2, label: "Sealed field log", obj: it.card, at: new THREE.Vector3(0, mm(10), mm(1)) },
    { layer: 3, label: "Wideband driver", obj: it.speaker, at: new THREE.Vector3(mm(-20), mm(20), 0) },
    { layer: 3, label: "Hand-crank dynamo", obj: it.dynamo, at: new THREE.Vector3(0, mm(13), 0) },
    { layer: 3, label: "Field cell pack", obj: it.cells, at: new THREE.Vector3(mm(-20), mm(10), mm(14)) },
  ];
  return it;
}
