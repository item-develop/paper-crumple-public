# Paper Crumple

Houdini Vellumで作った紙くしゃくしゃアニメをThree.jsで再生する。

## 構成

```
paper-crumple/
├── index.html
├── package.json
├── vite.config.js
├── merge_frames.py        # Houdini出力の前処理スクリプト
├── public/
│   └── animation.json     # 前処理後のアニメーションデータ（生成物）
└── src/
    ├── main.js            # Three.jsシーンセットアップ
    └── paper.js           # 紙メッシュのロジック
```

## セットアップ手順

### 1. プロジェクトディレクトリを作る

このフォルダ一式を任意の場所に置く。例：

```bash
cd ~/Desktop
# paper-crumple/ をここに配置
cd paper-crumple
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. Houdiniのデータをマージ

Houdiniの書き出し先（`~/Desktop/houdini/export/`）から
`static.json` と `frame_0001.json` 〜 `frame_0050.json` を読み込んで、
`public/animation.json` を生成する。

```bash
python3 merge_frames.py ~/Desktop/houdini/export public/animation.json
```

成功すると以下のような出力が出る：

```
Frames: 50, Vertices: 140
Wrote public/animation.json (1.23 MB)
```

### 4. 開発サーバ起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 が自動で開く。

紙が平らな状態から始まって、24fpsで50フレーム再生されてクシャクシャになって止まる。
紙は観察しやすいようにゆっくり自動回転する。

## トラブルシュート

### 紙が見えない

- ブラウザのコンソール（Cmd+Option+I → Console）でエラーを確認
- `public/animation.json` が存在するか確認
- 画面左上の info 表示で頂点数・フレーム数が出ているか確認

### 紙が歪んで見える、表示位置がずれている

- `src/main.js` の `camera.position.set(...)` を調整
- 紙の元データは原点中心、サイズ 1×1.414 なので、それを前提にカメラを置いている

### Houdiniのfpsが違う

- `src/main.js` の `const FPS = 24` を実際のfps（Houdiniの`$FPS`）に合わせる

## データ仕様

`public/animation.json` の構造：

```ts
{
  vertexCount: number;      // 頂点数（140）
  frameCount: number;       // フレーム数（50）
  indices: number[];        // 三角形インデックス。length = 三角形数 × 3
  uvs: number[];            // UV座標。length = vertexCount × 2
  positions: number[];      // 全フレームの頂点位置。length = vertexCount × 3 × frameCount
  normals: number[];        // 全フレームの法線。length = vertexCount × 3 × frameCount
}
```

`positions` と `normals` はフレーム連結。
フレーム f の頂点 i の x座標は `positions[f * vertexCount * 3 + i * 3 + 0]`。
