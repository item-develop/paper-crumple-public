import * as THREE from 'three';

/**
 * animation.json のデータから Three.js のメッシュを作る
 * 戻り値: { mesh, positionAttr, normalAttr }
 */
export function createPaper(animData) {
  const { vertexCount, indices, uvs, positions, normals } = animData;

  const geometry = new THREE.BufferGeometry();

  // ===== 頂点位置（最初のフレームで初期化）=====
  // 毎フレーム書き換える前提なので Float32Array を直接持つ
  const positionArray = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount * 3; i++) {
    positionArray[i] = positions[i]; // フレーム0
  }
  const positionAttr = new THREE.BufferAttribute(positionArray, 3);
  positionAttr.setUsage(THREE.DynamicDrawUsage); // 頻繁に更新される
  geometry.setAttribute('position', positionAttr);

  // ===== 法線 =====
  const normalArray = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount * 3; i++) {
    normalArray[i] = normals[i];
  }
  const normalAttr = new THREE.BufferAttribute(normalArray, 3);
  normalAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('normal', normalAttr);

  // ===== UV =====
  const uvArray = new Float32Array(uvs.length);
  for (let i = 0; i < uvs.length; i++) {
    uvArray[i] = uvs[i];
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));

  // ===== インデックス =====
  // 140頂点なので Uint16 で十分
  const indexArray = new Uint16Array(indices);
  geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));

  // ===== マテリアル =====
  // 両面表示（紙は薄いので裏も見えてほしい）
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.0,
    side: THREE.DoubleSide,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geometry, material);

  return {
    mesh,
    positionAttr,
    normalAttr,
  };
}

/**
 * 指定フレームの positions と normals でジオメトリを更新する
 */
export function updatePaperFrame(paper, animData, frameIdx) {
  const { vertexCount, positions, normals } = animData;
  const { positionAttr, normalAttr } = paper;

  const offset = frameIdx * vertexCount * 3;
  const len = vertexCount * 3;

  // positions
  const posArray = positionAttr.array;
  for (let i = 0; i < len; i++) {
    posArray[i] = positions[offset + i];
  }
  positionAttr.needsUpdate = true;

  // normals
  const nrmArray = normalAttr.array;
  for (let i = 0; i < len; i++) {
    nrmArray[i] = normals[offset + i];
  }
  normalAttr.needsUpdate = true;

  // バウンディングボックス再計算（カメラのフレーミングなどに必要）
  positionAttr.array; // touch
  paper.mesh.geometry.computeBoundingSphere();
  paper.mesh.geometry.computeBoundingBox();
}
