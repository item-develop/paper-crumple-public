#!/usr/bin/env python3
"""
Houdiniから書き出された frame_*.json を読み込み、
1ファイル (animation.json) にまとめる前処理スクリプト。

使い方:
    python3 merge_frames.py <input_dir> <output_file>

例:
    python3 merge_frames.py ~/Desktop/houdini/export public/animation.json
"""
import json
import os
import sys
from pathlib import Path


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    input_dir = Path(sys.argv[1]).expanduser()
    output_file = Path(sys.argv[2]).expanduser()

    # static.json を読む
    static_path = input_dir / "static.json"
    if not static_path.exists():
        print(f"ERROR: {static_path} not found")
        sys.exit(1)

    with open(static_path) as f:
        static = json.load(f)

    frame_count = static["frameCount"]
    vertex_count = static["vertexCount"]

    print(f"Frames: {frame_count}, Vertices: {vertex_count}")

    # 全フレームの positions と normals を平坦な配列に集約
    # メモリレイアウト: positions[frame * vertexCount * 3 + i] = float
    all_positions = []
    all_normals = []

    for frame in range(1, frame_count + 1):
        frame_path = input_dir / f"frame_{frame:04d}.json"
        if not frame_path.exists():
            print(f"WARNING: {frame_path} missing, skip")
            continue

        with open(frame_path) as f:
            data = json.load(f)

        positions = data["positions"]
        if len(positions) != vertex_count * 3:
            print(f"ERROR: frame {frame} positions length mismatch: "
                  f"{len(positions)} != {vertex_count * 3}")
            sys.exit(1)
        all_positions.extend(positions)

        normals = data.get("normals")
        if normals is None:
            print(f"WARNING: frame {frame} has no normals")
            normals = [0.0] * (vertex_count * 3)
        all_normals.extend(normals)

    # 出力データ
    out = {
        "vertexCount": vertex_count,
        "frameCount": frame_count,
        "indices": static["indices"],
        "uvs": static["uvs"],
        "positions": all_positions,  # frame * vertexCount * 3
        "normals": all_normals,       # frame * vertexCount * 3
    }

    # 出力ディレクトリを作成
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w") as f:
        json.dump(out, f)

    size_mb = output_file.stat().st_size / 1024 / 1024
    print(f"Wrote {output_file} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
