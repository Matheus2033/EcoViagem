import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tailwind v3 é processado via PostCSS (postcss.config.js) — gera CSS "plano"
// (sem @layer/oklch/color-mix), compatível com navegadores antigos (ex.: Edge 92).
// Em dev, o frontend (5173) chama a API Spring Boot (8080) via proxy em /api.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
