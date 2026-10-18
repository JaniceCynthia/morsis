// Cuts a welded shell into two halves along a plane, so the housing can open.
// Triangles that straddle the plane are clipped (Sutherland–Hodgman), not
// assigned whole to one side, which keeps the cut edge straight.
import * as THREE from "three";

type Vert = Float32Array;

export function splitByPlane(src: THREE.BufferGeometry, plane: THREE.Plane): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const g = src.index ? src.toNonIndexed() : src;
  // Position leads, so a vertex's first three floats are always its position.
  const names = ["position", "normal", "uv", "uv1", "tangent"].filter((n) => g.getAttribute(n));
  const attrs = names.map((n) => g.getAttribute(n) as THREE.BufferAttribute);
  const sizes = attrs.map((a) => a.itemSize);
  const stride = sizes.reduce((a, b) => a + b, 0);
  const posAt = 0;

  const read = (i: number): Vert => {
    const v = new Float32Array(stride);
    let o = 0;
    attrs.forEach((a, k) => {
      for (let c = 0; c < sizes[k]; c++) v[o + c] = a.array[i * sizes[k] + c] as number;
      o += sizes[k];
    });
    return v;
  };
  const p = new THREE.Vector3();
  const dist = (v: Vert) => plane.distanceToPoint(p.set(v[posAt], v[posAt + 1], v[posAt + 2]));
  const lerp = (a: Vert, b: Vert, t: number): Vert => {
    const v = new Float32Array(stride);
    for (let c = 0; c < stride; c++) v[c] = a[c] + (b[c] - a[c]) * t;
    return v;
  };

  const clip = (poly: Vert[], keepFront: boolean) => {
    const out: Vert[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const da = keepFront ? dist(a) : -dist(a);
      const db = keepFront ? dist(b) : -dist(b);
      if (da >= 0) out.push(a);
      if ((da >= 0) !== (db >= 0)) out.push(lerp(a, b, da / (da - db)));
    }
    return out;
  };

  const sides: number[][] = [[], []];
  const count = g.getAttribute("position").count;
  for (let i = 0; i < count; i += 3) {
    const tri = [read(i), read(i + 1), read(i + 2)];
    [true, false].forEach((front, s) => {
      const poly = clip(tri, front);
      for (let k = 1; k + 1 < poly.length; k++) sides[s].push(...poly[0], ...poly[k], ...poly[k + 1]);
    });
  }

  const build = (flat: number[]) => {
    const geo = new THREE.BufferGeometry();
    const n = flat.length / stride;
    let o = 0;
    names.forEach((name, k) => {
      const arr = new Float32Array(n * sizes[k]);
      for (let i = 0; i < n; i++) for (let c = 0; c < sizes[k]; c++) arr[i * sizes[k] + c] = flat[i * stride + o + c];
      geo.setAttribute(name, new THREE.BufferAttribute(arr, sizes[k]));
      o += sizes[k];
    });
    if (geo.getAttribute("normal")) {
      const nrm = geo.getAttribute("normal") as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < nrm.count; i++) v.fromBufferAttribute(nrm, i).normalize().toArray(nrm.array, i * 3);
    }
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  };
  return [build(sides[0]), build(sides[1])];
}
