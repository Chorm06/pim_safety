import { defineConfig } from 'vite';

// base: './' เพื่อให้ deploy บน GitHub Pages (sub-path) ได้
export default defineConfig({
  base: './',
  server: { host: false },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000 // Phaser ไฟล์ใหญ่ ไม่ต้องเตือน
  }
});
