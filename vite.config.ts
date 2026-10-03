import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // GitHub Pagesおよびローカル環境の両方で動作する相対パス
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        student: resolve(__dirname, 'student.html'),
      },
    },
  },
});
