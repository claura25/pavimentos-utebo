// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.pavimentosutebo.es',
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  integrations: [sitemap()],
  // Direcciones de la web antigua (WordPress) para no perder posiciones en Google
  redirects: {
    '/trabajos-realizados': '/trabajos/',
    '/colores': '/moldes-y-colores/',
    '/moldes': '/moldes-y-colores/',
    '/glosario': '/servicios/',
    '/mapa-web': '/',
    '/mas-informacion-sobre-las-cookies': '/politica-de-cookies/',
  },
});
