import * as THREE from "three";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { createPaper, updatePaperFrame } from "./paper.js";

// ==================================================
// シーン基本セットアップ
// ==================================================
const app = document.getElementById("app");
const info = document.getElementById("info");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f5);

const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.01,
  100,
);
camera.position.set(0, 3.5, 0);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

// 床 — 紙の影を受ける
const floorGeo = new THREE.PlaneGeometry(6, 4);
const floorMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.1;
floor.receiveShadow = true;
scene.add(floor);

// ライト
const ambient = new THREE.AmbientLight(0xffffff, 3);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 9);
dirLight.position.set(-1.2, 1.5, -0.8);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -3;
dirLight.shadow.camera.right = 3;
dirLight.shadow.camera.top = 2;
dirLight.shadow.camera.bottom = -2;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 5;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0);
fillLight.position.set(-2, 1, -1);
scene.add(fillLight);

// ポストプロセス — SSAO で折り目・凹みを暗くする
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const ssaoPass = new SSAOPass(
  scene,
  camera,
  window.innerWidth,
  window.innerHeight,
);
ssaoPass.kernelRadius = 0.01;
ssaoPass.minDistance = 0.0001;
ssaoPass.maxDistance = 0.08;
ssaoPass.intensity = 4;
composer.addPass(ssaoPass);

composer.addPass(new OutputPass());

// ==================================================
// GUI
// ==================================================
const animSettings = { speed: 1.5 };
const showGui = new URLSearchParams(window.location.search).get("gui") !== "none";
const gui = new GUI();
if (!showGui) gui.hide();

const lightFolder = gui.addFolder("Lighting");
lightFolder.add(ambient, "intensity", 0, 3, 0.01).name("Ambient");
lightFolder.add(dirLight, "intensity", 0, 4, 0.01).name("Key Light");
lightFolder.add(dirLight.position, "x", -5, 5, 0.1).name("Key X");
lightFolder.add(dirLight.position, "y", 0, 5, 0.1).name("Key Y");
lightFolder.add(dirLight.position, "z", -5, 5, 0.1).name("Key Z");
lightFolder.add(fillLight, "intensity", 0, 2, 0.01).name("Fill Light");

const ssaoFolder = gui.addFolder("SSAO");
ssaoFolder.add(ssaoPass, "kernelRadius", 0.001, 0.5, 0.001).name("Radius");
ssaoFolder.add(ssaoPass, "minDistance", 0.0001, 0.01, 0.0001).name("Min Dist");
ssaoFolder.add(ssaoPass, "maxDistance", 0.01, 0.5, 0.001).name("Max Dist");
ssaoFolder.add(ssaoPass, "intensity", 0, 4, 0.01).name("Intensity");

const shadowFolder = gui.addFolder("Shadow");
shadowFolder.add(floor.position, "y", -2, 0, 0.01).name("Floor Y");
shadowFolder.add(dirLight.shadow, "bias", -0.01, 0.01, 0.0001).name("Bias");

gui.add(animSettings, "speed", 0.1, 5, 0.1).name("Speed");

const cameraFolder = gui.addFolder("Camera");
cameraFolder
  .add(camera.position, "y", 0.5, 5, 0.1)
  .name("Height")
  .onChange(() => {
    camera.lookAt(0, 0, 0);
  });
cameraFolder
  .add(camera, "fov", 10, 90, 1)
  .name("FOV")
  .onChange(() => {
    camera.updateProjectionMatrix();
  });

// ==================================================
// データロード → 紙メッシュ作成（3枚）
// ==================================================
const papers = []; // { mesh, positionAttr, normalAttr, frameIdx, forward, playing }
let animData = null;

const PAPER_OFFSETS = [
  [-1.3, 0, 0],
  [0, 0, 0],
  [1.3, 0, 0],
];

async function init() {
  info.textContent = "fetching animation.json...";

  const res = await fetch(import.meta.env.BASE_URL + "animation.json");
  if (!res.ok) {
    info.textContent = `ERROR: failed to fetch animation.json (${res.status})`;
    return;
  }
  animData = await res.json();

  for (const offset of PAPER_OFFSETS) {
    const paper = createPaper(animData);
    paper.mesh.castShadow = true;
    paper.mesh.rotation.y = Math.PI;
    paper.mesh.position.set(offset[0], offset[1], offset[2]);
    scene.add(paper.mesh);

    papers.push({
      ...paper,
      frameIdx: 0,
      forward: true, // 次のクリックで再生する方向
      playing: false,
    });
  }

  // 全紙をフレーム0で初期化
  for (const p of papers) {
    updatePaperFrame(p, animData, 0);
  }

  info.textContent = "";
  startAnimation();
}

// ==================================================
// クリック → アニメーション切り替え
// ==================================================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener("click", (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const meshes = papers.map((p) => p.mesh);
  const hit = raycaster.intersectObjects(meshes);
  if (hit.length === 0) return;

  const p = papers.find((p) => p.mesh === hit[0].object);
  if (!p || p.playing) return;

  p.playing = true;
});

// ==================================================
// アニメーション再生
// ==================================================
const FPS = 24;
const FRAME_DURATION = 1.0 / FPS;
let prevTime = null;

function startAnimation() {
  prevTime = performance.now() / 1000;
  renderer.setAnimationLoop(tick);
}

function tick() {
  const now = performance.now() / 1000;
  const dt = now - prevTime;
  prevTime = now;

  if (!animData) return;

  const maxFrame = animData.frameCount - 1;

  for (const p of papers) {
    if (!p.playing) continue;

    if (p.forward) {
      p.frameIdx += (dt / FRAME_DURATION) * animSettings.speed;
      if (p.frameIdx >= maxFrame) {
        p.frameIdx = maxFrame;
        p.playing = false;
        p.forward = false; // 次クリックは逆再生
      }
    } else {
      p.frameIdx -= (dt / FRAME_DURATION) * animSettings.speed;
      if (p.frameIdx <= 0) {
        p.frameIdx = 0;
        p.playing = false;
        p.forward = true; // 次クリックは正再生
      }
    }

    updatePaperFrame(p, animData, p.frameIdx);
  }

  composer.render();
}

// ==================================================
// リサイズ対応
// ==================================================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

init().catch((err) => {
  console.error(err);
  info.textContent = "ERROR: " + err.message;
});
