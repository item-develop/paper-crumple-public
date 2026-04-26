import { defineConfig } from 'vite';

export default defineConfig({
  // index.html がプロジェクトルート、JSONは public/ に置く
  // public/ の中身はビルド時にそのままコピーされる
  server: {
    port: 5173,
    open: true,
  },
});
