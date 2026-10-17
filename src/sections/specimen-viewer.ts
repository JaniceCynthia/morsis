// GLB specimen viewer. Lazy-loaded by atlas.ts the first time a 3D scan exists.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Viewer } from "./atlas";

export function createViewer(canvas: HTMLCanvasElement): Viewer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const key = new THREE.DirectionalLight(0xf4f8e6, 2.2);
  key.position.set(3, 4, 2);
  const rim = new THREE.DirectionalLight(0xd4f53f, 1.4);
  rim.position.set(-3, 1.5, -3);
  scene.add(key, rim, new THREE.HemisphereLight(0xdfe8d0, 0x0b120a, 0.6));

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  camera.position.set(2.6, 1.2, 3.2);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.autoRotate = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  controls.autoRotateSpeed = 0.8;
  controls.minDistance = 1.2;
  controls.maxDistance = 8;
  controls.enablePan = false;

  const draco = new DRACOLoader().setDecoderPath("/vendor/draco/");
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const cache = new Map<string, THREE.Object3D>();
  let model: THREE.Object3D | null = null;
  let mixer: THREE.AnimationMixer | null = null;
  let running = false;
  const clock = new THREE.Clock();

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);

  const loop = () => {
    if (!running) return;
    requestAnimationFrame(loop);
    mixer?.update(clock.getDelta());
    controls.update();
    renderer.render(scene, camera);
  };

  return {
    async show(url) {
      resize();
      if (model) scene.remove(model);
      let obj = cache.get(url);
      let clips: THREE.AnimationClip[] = [];
      if (!obj) {
        const gltf = await loader.loadAsync(url);
        obj = gltf.scene;
        clips = gltf.animations;
        // Normalise: centre on the origin and fit a ~2 unit box.
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3()).length() || 1;
        const centre = box.getCenter(new THREE.Vector3());
        obj.position.sub(centre);
        const wrap = new THREE.Group();
        wrap.add(obj);
        wrap.scale.setScalar(2.4 / size);
        obj = wrap;
        cache.set(url, obj);
      }
      model = obj;
      scene.add(model);
      mixer = clips.length ? new THREE.AnimationMixer(model) : null;
      if (mixer) mixer.clipAction(clips[0]).play();
      controls.reset();
      if (!running) {
        running = true;
        clock.getDelta();
        loop();
      }
    },
    pause() {
      running = false;
    },
  };
}
