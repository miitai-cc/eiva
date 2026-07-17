import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'app',
  plugins: [react()],
  resolve: {
    preserveSymlinks: true
  },
  build: {
    outDir: '../../backend/assets/web',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 38999
  },
  preview: {
    host: '127.0.0.1'
  }
});
