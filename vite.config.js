import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Auténticos Bot Dashboard',
        short_name: 'Auténticos',
        description: 'Gestión de conversaciones y chatbot',
        theme_color: '#00101a',
        background_color: '#00101a',
        display: 'standalone',
        icons: [
          {
            src: '/Icono_asistente_virtual.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: '/Icono_asistente_virtual.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          },
          {
            src: '/Icono_asistente_virtual.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
