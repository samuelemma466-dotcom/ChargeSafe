import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 1. Expose 'REACT_APP_' env vars to import.meta.env
  envPrefix: 'REACT_APP_',
  build: {
    outDir: 'dist',
    sourcemap: false, // Disabled for production to save size
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000
  }
});