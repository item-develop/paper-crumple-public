import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/paper-crumple-public/',
  build: {
    rollupOptions: {
      input: {
        main: resolve('index.html'),
        vat: resolve('vat.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
