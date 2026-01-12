import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 1. Allow environment variables starting with REACT_APP_ to be exposed to client
  envPrefix: 'REACT_APP_',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000
  },
  // 2. Optimization settings to fix "module not found" errors during dev
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'],
  }
});