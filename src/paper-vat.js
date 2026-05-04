import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

const FRAME_COUNT = 50;

/**
 * VAT ファイル (FBX メッシュ + EXR ポジションテクスチャ) を読み込み、
 * animation.json と同じ形式の animData を返す。
 *
 * animData: { vertexCount, frameCount, indices, uvs, positions, normals }
 */
export async function loadVATData(basePath) {
  const fbxLoader = new FBXLoader();
  const exrLoader = new EXRLoader();
  exrLoader.setDataType(THREE.FloatType);

  // FBX と Position EXR を並列ロード
  console.log("[VAT] loading FBX + EXR from:", basePath);
  const [fbxGroup, posTex] = await Promise.all([
    fbxLoader.loadAsync(basePath + "geo/vertex_animation_textures1_mesh.fbx"),
    exrLoader.loadAsync(basePath + "tex/vertex_animation_textures1_pos.exr"),
  ]);
  console.log("[VAT] FBX + EXR loaded");

  // FBX からメッシュを取得
  let fbxMesh = null;
  fbxGroup.traverse((child) => {
    if (child.isMesh && !fbxMesh) fbxMesh = child;
  });
  if (!fbxMesh) throw new Error("FBX にメッシュが見つかりません");

  const geo = fbxMesh.geometry;
  const posAttr = geo.getAttribute("position");
  const uvAttr = geo.getAttribute("uv");
  const indexAttr = geo.getIndex();
  const vertexCount = posAttr.count;

  // VAT ルックアップ UV: FBXLoader は 2番目の UV を "uv1" として格納する
  const vatUvAttr = geo.getAttribute("uv2") || geo.getAttribute("uv1");

  console.log("[VAT] vertexCount:", vertexCount);
  console.log("[VAT] has index:", !!indexAttr, indexAttr ? "count=" + indexAttr.count : "");
  console.log("[VAT] has uv:", !!uvAttr, "has vatUv:", !!vatUvAttr);
  console.log("[VAT] geometry attributes:", Object.keys(geo.attributes));
  if (vatUvAttr) {
    console.log("[VAT] vatUv sample v0:", vatUvAttr.getX(0), vatUvAttr.getY(0));
    console.log("[VAT] vatUv sample v1:", vatUvAttr.getX(1), vatUvAttr.getY(1));
  }

  // インデックス配列
  const indices = [];
  if (indexAttr) {
    for (let i = 0; i < indexAttr.count; i++) indices.push(indexAttr.getX(i));
  } else {
    for (let i = 0; i < vertexCount; i++) indices.push(i);
  }

  // UV 配列（紙テクスチャマッピング用）
  const uvs = [];
  if (uvAttr) {
    for (let i = 0; i < uvAttr.count; i++) {
      uvs.push(uvAttr.getX(i), uvAttr.getY(i));
    }
  }

  // ===== EXR Position テクスチャからフレームデータを読み出す =====
  const posData = posTex.image.data; // Float32Array
  const texW = posTex.image.width;
  const texH = posTex.image.height;
  const channels = posData.length / (texW * texH); // 通常 4 (RGBA)

  console.log("[VAT] pos texture:", texW, "x", texH, "channels:", channels);
  console.log("[VAT] pos sample pixel[0]:", posData[0], posData[1], posData[2]);

  // FBX の rest pose 位置と EXR 各行を比較して正しい行マッピングを特定
  console.log("[VAT] FBX rest pos v0:", posAttr.getX(0), posAttr.getY(0), posAttr.getZ(0));
  console.log("[VAT] FBX rest pos v1:", posAttr.getX(1), posAttr.getY(1), posAttr.getZ(1));

  // テクスチャの行方向をサンプリング: vertex0 に対応する列で各行の Y 値を確認
  const sampleCol = vatUvAttr ? Math.round(vatUvAttr.getX(0) * (texW - 1)) : 0;
  console.log("[VAT] sampling col", sampleCol, "across rows:");
  for (let r = 0; r < Math.min(10, texH); r++) {
    const idx = (r * texW + sampleCol) * channels;
    console.log(`  row ${r}: ${posData[idx].toFixed(4)}, ${posData[idx + 1].toFixed(4)}, ${posData[idx + 2].toFixed(4)}`);
  }
  // 最終行付近
  for (let r = Math.max(0, texH - 5); r < texH; r++) {
    const idx = (r * texW + sampleCol) * channels;
    console.log(`  row ${r}: ${posData[idx].toFixed(4)}, ${posData[idx + 1].toFixed(4)}, ${posData[idx + 2].toFixed(4)}`);
  }

  const positions = new Float32Array(vertexCount * 3 * FRAME_COUNT);

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    const row = Math.min(frame, texH - 1);
    for (let v = 0; v < vertexCount; v++) {
      // テクスチャの列を VAT UV またはインデックスから決定
      let col;
      if (vatUvAttr) {
        col = Math.round(vatUvAttr.getX(v) * (texW - 1));
      } else {
        col = Math.min(v, texW - 1);
      }
      col = Math.max(0, Math.min(col, texW - 1));

      const pixelIdx = (row * texW + col) * channels;
      const off = (frame * vertexCount + v) * 3;

      // EXR は生のfloat値を格納 — バウンディングボックスデコード不要
      positions[off + 0] = posData[pixelIdx + 0];
      positions[off + 1] = posData[pixelIdx + 1];
      positions[off + 2] = posData[pixelIdx + 2];
    }
  }

  // ===== 法線をジオメトリから計算 =====
  const normals = new Float32Array(vertexCount * 3 * FRAME_COUNT);
  const tempGeo = new THREE.BufferGeometry();
  const tempPosArr = new Float32Array(vertexCount * 3);
  const tempPosAttr = new THREE.BufferAttribute(tempPosArr, 3);
  tempGeo.setAttribute("position", tempPosAttr);
  if (indexAttr) {
    tempGeo.setIndex(indexAttr);
  }

  for (let frame = 0; frame < FRAME_COUNT; frame++) {
    const srcOff = frame * vertexCount * 3;
    tempPosArr.set(positions.subarray(srcOff, srcOff + vertexCount * 3));
    tempPosAttr.needsUpdate = true;
    tempGeo.computeVertexNormals();

    const nrmAttr = tempGeo.getAttribute("normal");
    normals.set(nrmAttr.array, srcOff);
  }

  tempGeo.dispose();

  // デコード結果のサンプル表示
  console.log("[VAT] decoded pos frame0 vertex0:", positions[0], positions[1], positions[2]);
  console.log("[VAT] decoded nrm frame0 vertex0:", normals[0], normals[1], normals[2]);
  console.log("[VAT] animData ready:", { vertexCount, frameCount: FRAME_COUNT, indicesLen: indices.length, uvsLen: uvs.length });

  return { vertexCount, frameCount: FRAME_COUNT, indices, uvs, positions, normals };
}
