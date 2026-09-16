import type { ImageMetadata } from 'astro';

// El panel guarda las fotos como rutas absolutas del proyecto (/src/assets/...).
// Aquí se buscan esos archivos para que Astro pueda optimizarlos.
const archivos = import.meta.glob<{ default: ImageMetadata }>('/src/assets/**/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
});

export function imagen(ruta: string): ImageMetadata {
  const clave = ruta.replace(/^.*?src\/assets\//, '/src/assets/');
  const archivo = archivos[clave];
  if (!archivo) throw new Error(`No se encuentra la imagen «${ruta}». Tiene que estar dentro de src/assets/.`);
  return archivo.default;
}
