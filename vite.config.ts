import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Nu dorim să generăm un manifest, ci doar să gestionăm Service Worker-ul
      manifest: false,
      // Fișierul nostru sw.js se află la rădăcina proiectului
      srcDir: '.',
      filename: 'sw.js',
      // Folosim 'injectManifest' pentru a copia fișierul nostru fără a-l modifica
      strategies: 'injectManifest',
      injectManifest: {
        // Setarea injectionPoint la undefined previne plugin-ul din a injecta
        // un manifest de precache în fișierul nostru sw.js
        injectionPoint: undefined,
      },
    })
  ]
})
