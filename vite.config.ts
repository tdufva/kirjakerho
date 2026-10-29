import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), tailwind(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'Kirjakerhon Atlas', short_name: 'Atlas', lang: 'fi',
      description: 'Kirjoja, kulttuuria ja yhteisiä mielipiteitä.',
      theme_color: '#F3EBDD', background_color: '#F3EBDD', display: 'standalone',
      start_url: '/', scope: '/',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    },
    workbox: {
      navigateFallback: '/index.html',
      globPatterns: ['**/*.{js,css,html,svg,png,woff2,ttf,geojson}'],
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      // Private API responses are deliberately never put in the shared HTTP cache.
      runtimeCaching: []
    }
  })],
  build: { chunkSizeWarningLimit: 1000 }
})
