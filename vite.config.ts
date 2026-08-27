import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Prerender simple para Opción A (solo landing):
// - vite build genera dist/index.html con SEO base (title/description/OG/JSON-LD)
// - postbuild (scripts/prerender.mjs) copia a dist/marca/nueva/index.html con canonical ajustado
// Evita Vike/Puppeteer por principio de no sobreingenierizar (AGENT.md #1).
// Si en el futuro hay blog/pricing, migrar a vite-plugin-sitemap + Vike/SSG.
export default defineConfig({
  plugins: [react()],
})
