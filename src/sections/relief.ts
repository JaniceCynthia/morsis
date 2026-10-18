// Hero relief: a flat Lab Paper plaster wall where a carving of ravens, a
// starling murmuration and clouds rises wherever the pointer passes, holds for
// a moment, then sinks back into the wall.
//
// Two images: the carved wall, and the same wall with the carving taken out
// (only its broad light falloff). A "heat" mask follows the pointer; where it
// is warm the carving shows, and as heat drains the carving sinks. The shading
// also slides a few pixels into place as it rises, which is what sells depth
// rather than a crossfade. Plain WebGL, so the hero never waits on three.js.
import { reduceMotion } from "./dom";

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Heat: drains at a constant rate, and the brush (a capsule along the pointer's
// path since the last frame) tops it back up.
const MASK = `
precision highp float;
uniform sampler2D uPrev;
uniform vec2 uRes, uA, uB;
uniform float uRad, uDrain, uOn;
varying vec2 vUv;
float seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h);
}
void main() {
  float heat = max(texture2D(uPrev, vUv).r - uDrain, 0.0);
  float d = seg(vUv * uRes, uA, uB);
  heat = max(heat, (1.0 - smoothstep(uRad * 0.3, uRad, d)) * uOn);
  gl_FragColor = vec4(heat, 0.0, 0.0, 1.0);
}`;

const SHOW = `
precision highp float;
uniform sampler2D uRelief, uFlat, uMask;
uniform vec2 uScale, uShift, uCursor, uPx;
uniform float uFloor, uGlow;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 tuv = (vUv - 0.5) * uScale + uShift;
  float heat = texture2D(uMask, vUv).r;
  float m = max(smoothstep(0.0, 0.42, heat), uFloor);
  // Light comes from the upper left, so a rising form's shading arrives from there.
  vec2 slide = vec2(-0.0016, 0.0022) * (1.0 - m) * uScale;
  vec3 carved = texture2D(uRelief, tuv + slide).rgb;
  vec3 wall = texture2D(uFlat, tuv).rgb + (hash(floor(vUv / uPx)) - 0.5) * 0.022;
  vec3 col = mix(wall, carved, m);
  // A faint Signal Lime breath on the edge that is lifting, and near the pointer.
  float lifting = m * (1.0 - m) * 4.0;
  vec2 dp = (vUv - uCursor) / uPx;
  float near = exp(-dot(dp, dp) / (2.0 * 150.0 * 150.0)) * uGlow;
  col = mix(col, col * vec3(0.96, 1.0, 0.84), clamp(lifting * 0.3 + near * 0.45, 0.0, 1.0) * 0.38);
  gl_FragColor = vec4(col, 1.0);
}`;

/** How long a raised form holds before it starts to sink, and how fast it sinks. */
const HOLD_S = 1.2;
const BRUSH_CSS = 110; // radius in CSS px: a ~220 px reveal

export function initRelief(host: HTMLElement, canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) {
    host.classList.add("no-relief");
    return;
  }
  const still = reduceMotion();

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  const program = (frag: string) => {
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    const u = (n: string) => gl.getUniformLocation(p, n);
    return { p, u };
  };
  const maskProg = program(MASK);
  const showProg = program(SHOW);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const texture = (w = 1, h = 1, linear = true) => {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const relief = texture();
  const flat = texture();
  let imgW = 16, imgH = 9, ready = 0;
  const load = (t: WebGLTexture, src: string, main: boolean) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      if (main) {
        imgW = img.naturalWidth;
        imgH = img.naturalHeight;
      }
      if (++ready === 2) host.classList.add("has-relief");
    };
    img.src = src;
  };
  const big = Math.max(screen.width, screen.height) * Math.min(2, devicePixelRatio || 1) > 1700;
  load(relief, big ? "/assets/img/hero/relief-2560.webp" : "/assets/img/hero/relief-1440.webp", true);
  load(flat, "/assets/img/hero/flat-480.webp", false);

  // Two heat buffers at quarter resolution, ping-ponged each frame.
  const Q = 4;
  let mw = 1, mh = 1;
  const fbos = [0, 1].map(() => ({ tex: texture(), fb: gl.createFramebuffer()! }));
  let cur = 0;
  let W = 0, H = 0, dpr = 1;
  const size = () => {
    dpr = Math.min(1.75, devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    mw = Math.max(1, Math.round(W / Q));
    mh = Math.max(1, Math.round(H / Q));
    for (const f of fbos) {
      gl.bindTexture(gl.TEXTURE_2D, f.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, mw, mh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, f.tex, 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  size();
  new ResizeObserver(size).observe(canvas);

  // ---- pointer, ghost and touch -------------------------------------------
  // Pointer positions are CSS px relative to the canvas, y down.
  let ptr: { x: number; y: number } | null = null;
  let last: { x: number; y: number } | null = null;
  let lastMove = 0;
  const toLocal = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  host.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" && !(e.buttons & 1)) return;
    ptr = toLocal(e);
    lastMove = performance.now();
  });
  host.addEventListener("pointerdown", (e) => {
    ptr = toLocal(e);
    lastMove = performance.now();
  });
  host.addEventListener("pointerleave", () => (ptr = null));
  const coarse = matchMedia("(hover: none)").matches;

  // On load the wall shows itself once: a slow sweep through the ravens and the
  // murmuration, so a visitor learns the surface responds before they touch it.
  const t0 = performance.now();
  const SWEEP_MS = 3600;
  const sweepPath = (k: number) => ({ x: W * (0.12 + 0.78 * k), y: H * (0.42 - 0.2 * Math.sin(k * Math.PI) + 0.08 * Math.sin(k * 9)) });
  // On touch screens a ghost drifts whenever the visitor is not dragging.
  const ghostPath = (t: number) => ({ x: W * (0.55 + 0.33 * Math.sin(t / 5200)), y: H * (0.4 + 0.18 * Math.sin(t / 3700 + 1)) });

  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  let prevT = performance.now();

  const frame = (now: number) => {
    requestAnimationFrame(frame);
    if (!visible || ready < 2 || !W) return;
    const dt = Math.min(0.05, (now - prevT) / 1000);
    prevT = now;

    let brush: { x: number; y: number } | null = null;
    const since = now - t0;
    if (still) brush = null;
    else if (ptr && now - lastMove < 2500) brush = ptr;
    else if (since < SWEEP_MS) brush = sweepPath(since / SWEEP_MS);
    else if (coarse) brush = ghostPath(now);
    const a = last && brush ? last : brush;
    last = brush;

    // Heat drains so a form holds for HOLD_S, then sinks over ~0.6 s.
    const drain = (0.58 / HOLD_S) * dt;
    gl.useProgram(maskProg.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[1 - cur].fb);
    gl.viewport(0, 0, mw, mh);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbos[cur].tex);
    gl.uniform1i(maskProg.u("uPrev"), 0);
    gl.uniform2f(maskProg.u("uRes"), mw, mh);
    const mx = (p: { x: number; y: number }) => [p.x / Q, mh - p.y / Q] as const;
    gl.uniform2f(maskProg.u("uA"), ...(a ? mx(a) : ([-999, -999] as const)));
    gl.uniform2f(maskProg.u("uB"), ...(brush ? mx(brush) : ([-999, -999] as const)));
    gl.uniform1f(maskProg.u("uRad"), BRUSH_CSS / Q);
    gl.uniform1f(maskProg.u("uDrain"), drain);
    gl.uniform1f(maskProg.u("uOn"), brush ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    cur = 1 - cur;

    // Cover-fit the image, anchored a little right of centre where the birds are.
    const ca = W / H, ia = imgW / imgH;
    const sx = ca > ia ? 1 : ca / ia;
    const sy = ca > ia ? ia / ca : 1;
    const anchorX = 0.58;
    const shiftX = 0.5 + (anchorX - 0.5) * (1 - sx);

    gl.useProgram(showProg.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    [relief, flat, fbos[cur].tex].forEach((t, i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
    });
    gl.uniform1i(showProg.u("uRelief"), 0);
    gl.uniform1i(showProg.u("uFlat"), 1);
    gl.uniform1i(showProg.u("uMask"), 2);
    gl.uniform2f(showProg.u("uScale"), sx, sy);
    gl.uniform2f(showProg.u("uShift"), shiftX, 0.5);
    gl.uniform2f(showProg.u("uPx"), 1 / W, 1 / H);
    const c = brush || { x: -9999, y: -9999 };
    gl.uniform2f(showProg.u("uCursor"), c.x / W, 1 - c.y / H);
    // At rest the carving is a whisper on the wall; reduced motion shows it plainly.
    gl.uniform1f(showProg.u("uFloor"), still ? 0.55 : 0.07);
    gl.uniform1f(showProg.u("uGlow"), brush ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  requestAnimationFrame(frame);
}
