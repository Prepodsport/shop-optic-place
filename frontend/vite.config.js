import { defineConfig } from 'vite';  // Обязательно с фигурными скобками!
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      host: '192.168.68.103'
    }
  }
});
