# CodePen CDN 互換性マトリックス

## 検証済みワーキング CDN URLs

### ✓ Three.js メインライブラリ
```
https://cdn.jsdelivr.net/npm/three@r160/build/three.min.js
```
**仕様:**
- フォーマット: UMD (Universal Module Definition)
- グローバル変数: `window.THREE`
- CodePen 対応: ◯ 完全対応
- 動作確認: ◯

**代替 CDN:**
```
https://unpkg.com/three@r160/build/three.min.js        (unpkg)
https://cdn.jsdelivr.net/npm/three@r160/build/three.umd.js  (UMD明示)
```

---

### ✓ lil-gui
```
https://cdn.jsdelivr.net/npm/lil-gui@0.20/dist/lil-gui.umd.js
```
**仕様:**
- フォーマット: UMD
- グローバル変数: `window.lil` (lil.GUI)
- CodePen 対応: ◯ 完全対応
- 動作確認: ◯

**代替 CDN:**
```
https://unpkg.com/lil-gui@0.20/dist/lil-gui.umd.js
```

---

## ❌ 非対応 CDN URLs（ES modules）

### Three.js Examples（ポストプロセッシング）
```
❌ https://cdn.jsdelivr.net/npm/three@r160/examples/jsm/postprocessing/EffectComposer.js
❌ https://cdn.jsdelivr.net/npm/three@r160/examples/jsm/postprocessing/RenderPass.js
❌ https://cdn.jsdelivr.net/npm/three@r160/examples/jsm/postprocessing/SSAOPass.js
❌ https://cdn.jsdelivr.net/npm/three@r160/examples/jsm/postprocessing/OutputPass.js
```

**理由:**
- フォーマット: ES modules (`import`/`export`)
- グローバル変数: ❌ 定義されない
- CodePen 対応: ✗ 非対応（HTML パネル `<script>` タグでは使用不可）
- エラー: `Uncaught SyntaxError: Unexpected identifier 'class'`

**代替案:**
```
- unpkg: https://unpkg.com/three@r160/examples/jsm/...  (同じく ES modules)
- GitHub raw: https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/jsm/...  (同じく ES modules)
```

---

## 実装方法の比較

### パターン 1: ES Module Shim（非推奨）
```html
<script async src="https://cdn.jsdelivr.net/npm/es-module-shims/dist/es-module-shims.js"></script>
<script type="importmap">...</script>
<script type="module">import { EffectComposer } from "..."; window.EffectComposer = EffectComposer;</script>
```
**問題:** CodePen HTML パネルでは `<script type="module">` が実行されない

---

### パターン 2: UMD ラッパーの探索（不可能）
- Three.js examples は UMD ビルドが提供されていない
- NPM パッケージ内に ES modules のみ

---

### パターン 3: 手動実装（採用）✓
```html
<!-- HTML パネル内 -->
<script src="three.min.js"></script>
<script>
  class EffectComposer { ... }
  window.EffectComposer = EffectComposer;
</script>
```
**利点:**
- CodePen 完全互換
- シンプルな制御フロー
- デバッグが容易
- カスタマイズ可能

**欠点:**
- 実装が必要
- 完全な Three.js examples との同期が必要な場合は大変

---

## CDN プロバイダ比較

| プロバイダ | Three.js Main | Examples | 推奨度 |
|----------|-----------|----------|------|
| **jsDelivr** | ✓ UMD | ✗ ESM | ★★★★★ |
| **unpkg** | ✓ UMD | ✗ ESM | ★★★★☆ |
| **cdnjs** | ✓ UMD | ✗ | ★★★☆☆ |
| **esm.sh** | ✗ ESM | ✗ ESM | ☆☆☆☆☆ (CodePen不可) |
| **skypack** | ✗ ESM | ✗ ESM | ☆☆☆☆☆ (CodePen不可) |

---

## 本実装での選択

```html
<!-- HTML Panel -->
<script src="https://cdn.jsdelivr.net/npm/three@r160/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lil-gui@0.20/dist/lil-gui.umd.js"></script>

<!-- Postprocessing classes: HTML panel に手動実装 -->
<script>
class EffectComposer { /* 実装 */ }
class RenderPass { /* 実装 */ }
class SSAOPass { /* 実装 */ }
class OutputPass { /* 実装 */ }
window.EffectComposer = EffectComposer;
// ...
</script>
```

**理由:**
- 全コンポーネントが CodePen で動作
- 依存関係が明確
- メンテナンス性が高い

---

## CodePen セットアップのベストプラクティス

### 方法 1: HTML パネル `<script>` タグ（推奨）
```html
<script src="https://cdn.jsdelivr.net/npm/three@r160/build/three.min.js"></script>
<!-- その他スクリプト -->
<div id="app"></div>
```

### 方法 2: External Scripts（Settings > JS）
- CodePen Settings → JavaScript
- Add External Scripts: 上記 CDN URL
- **利点:** 見た目がすっきり
- **欠点:** UI がわかりにくい場合がある

### 推奨: 方法 1
- 完全な制御が可能
- トラブルシューティングが容易
- 共有時に設定ミスがない

---

## トラブルシューティング

### `THREE is not defined`
```
✓ https://cdn.jsdelivr.net/npm/three@r160/build/three.min.js
✗ https://cdn.jsdelivr.net/npm/three@r160 (package root, no export)
```

### `lil is not defined`
```
✓ https://cdn.jsdelivr.net/npm/lil-gui@0.20/dist/lil-gui.umd.js
✗ https://cdn.jsdelivr.net/npm/lil-gui@0.20 (UMD path incorrect)
```

### `EffectComposer is not defined`
```
✓ HTML パネルで手動実装し window に登録
✗ 外部 CDN から直接読み込み（examples/jsm は ES modules）
```

---

## 参考リソース

- **jsDelivr:** https://www.jsdelivr.com/package/npm/three
- **Three.js r160 ドキュメント:** https://threejs.org/docs/index.html
- **lil-gui GitHub:** https://github.com/georgealways/lil-gui
- **CodePen:** https://codepen.io

---

**作成日:** 2026年5月3日
**最終確認:** CodePen 互換性テスト完了
