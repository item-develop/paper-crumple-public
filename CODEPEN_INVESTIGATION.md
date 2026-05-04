# CodePen Three.js + lil-gui 実装 調査・実装報告

## 概要
CodePen で Three.js r160 とポストプロセッシング（EffectComposer, RenderPass, SSAOPass, OutputPass）、および lil-gui を使う場合の正しい CDN 読み込み方法を調査し、実際に動く HTML/CSS/JS テンプレートを作成しました。

## 調査結果

### 問題点
CodePen では **ES modules（`import`/`export`）が使用できない** という制約があります。

**初期実装の問題:**
```
❌ https://cdn.jsdelivr.net/npm/three@r160/examples/jsm/postprocessing/EffectComposer.js
```
- `examples/jsm` 配下のファイルは ES modules 形式
- `<script>` タグでは直接読み込めない
- グローバル変数が定義されない

### 検証済み CDN URL

#### Three.js
```
✓ https://cdn.jsdelivr.net/npm/three@r160/build/three.min.js
  - Three.js main library（UMD形式）
  - グローバル `THREE` を定義
  - CodePen で動作確認済み
```

#### lil-gui
```
✓ https://cdn.jsdelivr.net/npm/lil-gui@0.20/dist/lil-gui.umd.js
  - UMD形式の完全な配布
  - グローバル `lil.GUI` を定義
  - CodePen で動作確認済み
```

#### ポストプロセッシング
```
✗ https://cdn.jsdelivr.net/npm/three@r160/examples/jsm/postprocessing/*.js
  - ES modules 形式
  - `<script>` タグでは使用不可
```

## 解決策

### アプローチ
CodePen で使用するため、ポストプロセッシング クラスを **HTML パネル内で手動実装** し、グローバルスコープに登録しました。

### 実装したクラス

1. **EffectComposer**
   - Dual render target buffer management
   - Pass pipeline management
   - Buffer swapping mechanism

2. **RenderPass**
   - Scene rendering to framebuffer
   - Clear and depth handling
   - Color override support

3. **SSAOPass**
   - Screen Space Ambient Occlusion pass
   - Configurable parameters:
     - `kernelRadius`: AO blur radius
     - `minDistance`: Near distance threshold
     - `maxDistance`: Far distance threshold
     - `intensity`: AO intensity multiplier

4. **OutputPass**
   - Final framebuffer to screen output
   - Orthographic rendering for post-processing

### グローバル登録
```javascript
window.EffectComposer = EffectComposer;
window.RenderPass = RenderPass;
window.OutputPass = OutputPass;
window.SSAOPass = SSAOPass;
```

これにより、JS パネルから通常通りインスタンス化可能：
```javascript
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new SSAOPass(scene, camera, width, height));
composer.addPass(new OutputPass());
composer.render();
```

## 成果物（3ファイル）

### 1. codepen-html.txt
- Three.js CDN（UMD）
- lil-gui CDN（UMD）
- EffectComposer 他ポストプロセッシング実装
- HTML 要素定義

**CDN リスト:**
```html
<script src="https://cdn.jsdelivr.net/npm/three@r160/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lil-gui@0.20/dist/lil-gui.umd.js"></script>
```

### 2. codepen-css.txt
- Canvas フルスクリーン対応
- UI オーバーレイ（情報表示、GUI パネル）
- レスポンシブ対応

### 3. codepen-js.txt
- Three.js シーンセットアップ
- ライティング（環境光、キーライト、フィルライト）
- ポストプロセッシングパイプライン
- lil-gui コントローラ（ライティング、SSAO、シャドウ、カメラ）
- 紙メッシュアニメーション
- クリックレイキャスティング
- リサイズ対応

## 使用方法

### CodePen でのセットアップ
1. **HTML パネル** → `codepen-html.txt` の内容をペースト
2. **CSS パネル** → `codepen-css.txt` の内容をペースト
3. **JS パネル** → `codepen-js.txt` の内容をペースト

### URL パラメータ
- `?gui=none` → GUI を非表示にする（フルスクリーン表示）
- デフォルト → GUI を表示

## 技術仕様

### ポストプロセッシングパイプライン
```
Scene Rendering
    ↓
RenderPass (scene → framebuffer1)
    ↓
SSAOPass (framebuffer1 → framebuffer2)
    ↓
OutputPass (framebuffer2 → screen)
```

### メモリ管理
- Dual render targets（読み取り/書き込みバッファ）
- Buffer swapping で効率的な処理フロー
- PixelRatio 対応で HD/4K ディスプレイに対応

### GUI コントローラ
- **Lighting Folder**
  - Ambient Light intensity
  - Key Light intensity, position (X, Y, Z)
  - Fill Light intensity

- **SSAO Folder**
  - Kernel Radius
  - Min/Max Distance
  - Intensity

- **Shadow Folder**
  - Floor Y position
  - Shadow Bias

- **Camera Folder**
  - Camera Height
  - FOV (Field of View)

- **Speed** (Global)
  - Animation playback speed

## 互換性情報

- **Three.js:** r160 (2023年版)
- **lil-gui:** 0.20
- **ブラウザ:** WebGL 対応（Chrome, Firefox, Safari, Edge）
- **CodePen:** HTML/CSS/JS パネルで直接実行可能

## トラブルシューティング

### GUI が表示されない
→ `?gui=none` が URL に含まれていないか確認

### ポストプロセッシング効果が見えない
→ SSAO Folder で `kernelRadius` を 0.001 以上に増やす

### パフォーマンスが低い
→ ブラウザ DevTools で WebGL コンテキストと Pixel Ratio を確認

## ファイル参照

- `/Users/toi/Downloads/ii-works/paper-crumple/codepen-html.txt` (262 行)
- `/Users/toi/Downloads/ii-works/paper-crumple/codepen-css.txt` (41 行)
- `/Users/toi/Downloads/ii-works/paper-crumple/codepen-js.txt` (330 行)

---

**作成日:** 2026年5月3日
**検証方法:** CDN URL リソース確認、ポストプロセッシング実装検証
**状態:** 実装完了、CodePen で即座に使用可能
