// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        content: './src/content/index.jsx' // This will be output as content.js
      },
      output: {
        entryFileNames: '[name].js', // This means content.jsx will become content.js
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  }
});