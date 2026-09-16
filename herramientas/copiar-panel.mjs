// Copia el programa del panel (Sveltia CMS) desde node_modules a public/admin
// para no depender de un CDN externo. Se ejecuta solo antes de `npm run dev` y `npm run build`.
import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origen = join(raiz, 'node_modules/@sveltia/cms/dist/sveltia-cms.js');
const destino = join(raiz, 'public/admin/sveltia-cms.js');

try {
  await mkdir(dirname(destino), { recursive: true });
  await copyFile(origen, destino);
  console.log('Panel actualizado: public/admin/sveltia-cms.js');
} catch (error) {
  console.warn('No se ha podido copiar el panel:', error.message);
}
