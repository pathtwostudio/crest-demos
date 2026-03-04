import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        chat: resolve(__dirname, 'chat.html'),
        gallery: resolve(__dirname, 'gallery.html'),
      },
    },
  },
});
