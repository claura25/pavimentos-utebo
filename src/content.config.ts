import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Las imágenes se guardan como ruta (/src/assets/...) porque así las escribe el panel.
// El ayudante src/data/imagenes.ts las convierte en imágenes optimizables por Astro.

const servicios = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/servicios' }),
  schema: z.object({
    titulo: z.string(),
    resumen: z.string(),
    idealPara: z.array(z.string()).default([]),
    imagen: z.string().optional(),
    orden: z.number().default(99),
    destacado: z.boolean().default(false),
  }),
});

const trabajos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/trabajos' }),
  schema: z.object({
    titulo: z.string(),
    localidad: z.string().optional(),
    fecha: z.coerce.date(),
    servicio: z.string(),
    detalles: z.array(z.string()).default([]),
    portada: z.string(),
    galeria: z.array(z.string()).default([]),
    destacado: z.boolean().default(false),
  }),
});

export const collections = { servicios, trabajos };
