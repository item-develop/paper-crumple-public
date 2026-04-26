import * as THREE from 'three';
import { createPaper, updatePaperFrame } from './paper.js';

// ==================================================
// シーン基本セットアップ
// ==================================================
const app = document.getElementById('app');
const info = document.getElementById('info');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5f5f5);

const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.01,
  100,
);
camera.position.set(0.7, 0.6, 1.2);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

// ライト
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(2, 3, 2);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
fillLight.position.set(-2, 1, -1);
scene.add(fillLight);

// 参考用グリッド（紙のサイズ感がわかるように）
const grid = new THREE.GridHelper(2, 20, 0xcccccc, 0xeeeeee);
scene.add(grid);

// ==================================================
// データロード → 紙メッシュ作成
// ==================================================
let paper = null;
let animData = null;

async function init() {
  info.textContent = 'fetching animation.json...';

  const res = await fetch('/animation.json');
  if (!res.ok) {
    info.textContent = `ERROR: failed to fetch animation.json (${res.status})`;
    return;
  }
  animData = await res.json();

  info.textContent =
    `vertices: ${animData.vertexCount}, ` +
    `frames: ${animData.frameCount}, ` +
    `triangles: ${animData.indices.length / 3}`;

  paper = createPaper(animData);
  scene.add(paper.mesh);

  // 最初のフレームを表示
  updatePaperFrame(paper, animData, 0);

  startAnimation();
}

// ==================================================
// アニメーション再生
// ==================================================
const FPS = 24; // Houdiniのデフォルトと合わせる
const FRAME_DURATION = 1.0 / FPS;
let animStartTime = null;
let lastFrameIdx = -1;

function startAnimation() {
  animStartTime = performance.now() / 1000;
  renderer.setAnimationLoop(tick);
}

function tick() {
  const now = performance.now() / 1000;

  if (paper && animData) {
    const elapsed = now - animStartTime;
    const totalFrames = animData.frameCount;
    const totalDuration = totalFrames * FRAME_DURATION;

    // 1回再生して最後で止める（ループしない）
    let frameIdx;
    if (elapsed >= totalDuration) {
      frameIdx = totalFrames - 1;
    } else {
      frameIdx = Math.floor(elapsed / FRAME_DURATION);
    }

    if (frameIdx !== lastFrameIdx) {
      updatePaperFrame(paper, animData, frameIdx);
      lastFrameIdx = frameIdx;
      info.textContent = `frame ${frameIdx + 1} / ${totalFrames}`;
    }

    // 紙をゆっくり回転（観察用）
    paper.mesh.rotation.y = elapsed * 0.15;
  }

  renderer.render(scene, camera);
}

// ==================================================
// リサイズ対応
// ==================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

init().catch((err) => {
  console.error(err);
  info.textContent = 'ERROR: ' + err.message;
});
