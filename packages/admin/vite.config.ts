import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Monorepo: resolve @kitchenasty/shared direto do TS fonte (evita CJS dist
// que o Rollup não consegue re-exportar). O tsc do admin usa o dist (types).
const sharedSrc = fileURLToPath(new URL('../../packages/shared/src', import.meta.url));

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@kitchenasty/shared/tokens.css', replacement: sharedSrc + '/tokens.css' },
      { find: '@kitchenasty/shared/permissions', replacement: sharedSrc + '/permissions.ts' },
      { find: '@kitchenasty/shared', replacement: sharedSrc + '/index.ts' },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
});
