import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@content': fileURLToPath(new URL('../content', import.meta.url)) },
  },
  server: {
    fs: { allow: ['..'] },
    proxy: { '/api': 'http://127.0.0.1:5000' },
  },
  build: {
    // three.js is reached only through the lazy AvatarScene import, so it stays off the first paint.
    chunkSizeWarningLimit: 1200,
  },
});
