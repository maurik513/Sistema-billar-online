import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Rutas relativas: permite abrir el build en Vercel o incluso como
  // archivo local, sin depender de que la app viva en la raíz del dominio.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Billar System',
        short_name: 'Billar',
        description: 'Gestión de mesas, ventas, inventario y caja de billar — 100% local',
        theme_color: '#141414',
        background_color: '#141414',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cachea todo el "shell" de la app para que funcione sin conexión
        // después de la primera visita (los datos ya viven en localStorage).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: './index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 3000,
  },
});
