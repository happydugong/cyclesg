import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  const base = process.env.VITE_BASE_PATH ?? '/';

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
        manifest: {
          name: 'CycleSG',
          short_name: 'CycleSG',
          description:
            'Singapore cycling planner with live GPS positioning and Park Connector overlays.',
          start_url: base,
          scope: base,
          display: 'standalone',
          background_color: '#0f172a',
          theme_color: '#0f172a',
          orientation: 'portrait-primary',
          icons: [
            {
              src: `${base}favicon.svg`,
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any'
            },
            {
              src: `${base}apple-touch-icon.svg`,
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true
        }
      })
    ],
    server: {
      host: true,
      port: 5173
    }
  };
});
