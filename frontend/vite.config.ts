import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Tailwind v3 é processado via PostCSS (postcss.config.js) — gera CSS "plano"
// (sem @layer/oklch/color-mix), compatível com navegadores antigos (ex.: Edge 92).
// Em dev, o frontend (5173) chama a API Spring Boot (8080) via proxy em /api.
export default defineConfig({
  plugins: [react()],
  build: {
    // Transpila o JS para rodar em navegadores mais antigos também (além dos
    // atuais de Chrome, Edge, Firefox, Safari e Brave).
    target: ['chrome87', 'edge88', 'firefox78', 'safari13'],
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Separa as bibliotecas pesadas em "pedaços" próprios, que ficam em
        // cache do navegador e só são baixados quando a tela que os usa abre
        // (ex.: os gráficos só carregam no Dashboard/Impacto). Deixa o
        // carregamento inicial bem mais leve, principalmente no celular.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
