import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const dist = join(import.meta.dirname, '..', 'dist');
const index = join(dist, 'index.html');

if (!existsSync(index)) {
  console.error('[prerender] dist/index.html no existe — ejecuta vite build primero');
  process.exit(1);
}

// Ruta prerenderizada: /marca/nueva
// Copia el index.html base y ajusta canonical/og:url/title para esa ruta.
// Es suficiente para que crawlers sin JS vean contenido SEO válido sin necesidad de Puppeteer.
const target = join(dist, 'marca', 'nueva', 'index.html');
mkdirSync(dirname(target), { recursive: true });

let html = readFileSync(index, 'utf8');

// Ajustes específicos para /marca/nueva
html = html
  .replace(
    '<link rel="canonical" href="https://www.branddna.lat/" />',
    '<link rel="canonical" href="https://www.branddna.lat/marca/nueva" />'
  )
  .replace(
    '<meta property="og:url" content="https://www.branddna.lat/" />',
    '<meta property="og:url" content="https://www.branddna.lat/marca/nueva" />'
  )
  .replace(
    '<title>BrandDNA — Generador de contenido con voz de marca para pymes</title>',
    '<title>Crear marca — BrandDNA</title>'
  );

writeFileSync(target, html);
console.log('[prerender] generado', target);

// Verificación rápida
const sitemap = join(dist, 'sitemap.xml');
const robots = join(dist, 'robots.txt');
console.log('[prerender] sitemap:', existsSync(sitemap) ? 'ok' : 'falta (usa public/sitemap.xml)');
console.log('[prerender] robots:', existsSync(robots) ? 'ok' : 'falta');
