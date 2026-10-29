import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [react(), tailwind(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'Kirjakerhon Atlas', short_name: 'Atlas', lang: 'fi',
      description: 'Kirjoja, kulttuuria ja yhteisiä mielipiteitä.',
      theme_color: '#1C1713', background_color: '#1C1713', display: 'standalone',
      id: base, start_url: base, scope: base,
      icons: [
        { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    },
    workbox: {
      navigateFallback: `${base}index.html`,
      globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,ttf,geojson}'],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      // Private API responses are deliberately never put in the shared HTTP cache.
      runtimeCaching: []
    }
  })],
  build: { chunkSizeWarningLimit: 1000 }
})
