// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const repo = 'story-squares';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  base: mode === 'production' ? `/${repo}/` : '/',  // для GitHub Pages
  server: { port: 5175 },

  build: {
    outDir: 'docs',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('pdf-lib')) return 'pdf-lib';
            if (id.includes('@radix-ui')) return 'vendor-ui';
            if (id.includes('react')) return 'vendor-react';
          }
        },
      },
    },
  },
}));
