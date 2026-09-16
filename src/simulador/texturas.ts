import { hash2, mod, type DefinicionMolde, type Muestra } from './patrones';

// Genera relieve, luminancia y máscara de desmoldeante a partir de un patrón.
// El color se aplica después (componer) para poder cambiarlo al instante.

export interface Generado {
  res: number;
  lum: Uint8Array;
  mascara: Uint8Array;
  normal: Uint8Array; // RGBA
}

export type RGB = [number, number, number];

const NRES = 512;
// Las juntas reales del impreso rondan 1-2 cm; reduce el ancho definido en cada molde
const ESCALA_JUNTA = 0.65;

function ruidoValor(x: number, y: number, periodo: number, semilla: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const ix0 = mod(x0, periodo);
  const iy0 = mod(y0, periodo);
  const ix1 = (ix0 + 1) % periodo;
  const iy1 = (iy0 + 1) % periodo;
  const a = hash2(ix0 * 31 + semilla, iy0);
  const b = hash2(ix1 * 31 + semilla, iy0);
  const c = hash2(ix0 * 31 + semilla, iy1);
  const d = hash2(ix1 * 31 + semilla, iy1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// Ruido fractal periódico en [-1, 1]
function campo(periodoBase: number, octavas: number, semilla: number): Float32Array {
  const out = new Float32Array(NRES * NRES);
  let total = 0;
  for (let o = 0; o < octavas; o++) {
    const periodo = periodoBase << o;
    const amp = 0.5 ** o;
    const escala = periodo / NRES;
    total += amp;
    for (let y = 0; y < NRES; y++) {
      for (let x = 0; x < NRES; x++) {
        out[y * NRES + x] += amp * ruidoValor(x * escala, y * escala, periodo, semilla + o * 101);
      }
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] / total) * 2 - 1;
  return out;
}

let ruidos: { warpX: Float32Array; warpY: Float32Array; superficie: Float32Array; grano: Float32Array } | null = null;

function obtenerRuidos() {
  return (ruidos ??= {
    warpX: campo(8, 3, 1),
    warpY: campo(8, 3, 2),
    superficie: campo(16, 5, 3),
    grano: campo(64, 2, 4),
  });
}

function muestrear(c: Float32Array, u: number, v: number): number {
  const x = u * NRES - 0.5;
  const y = v * NRES - 0.5;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const ix0 = mod(x0, NRES);
  const iy0 = mod(y0, NRES);
  const ix1 = (ix0 + 1) % NRES;
  const iy1 = (iy0 + 1) % NRES;
  const a = c[iy0 * NRES + ix0];
  const b = c[iy0 * NRES + ix1];
  const cc = c[iy1 * NRES + ix0];
  const d = c[iy1 * NRES + ix1];
  return a + (b - a) * fx + (cc - a) * fy + (a - b - cc + d) * fx * fy;
}

const suave = (a: number, b: number, t: number) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

// area < 1 genera solo una parte de la baldosa (para miniaturas)
export function generar(def: DefinicionMolde, res: number, area = 1): Generado {
  const R = obtenerRuidos();
  const n = res * res;
  const alt = new Float32Array(n);
  const lum = new Uint8Array(n);
  const mascara = new Uint8Array(n);
  const m: Muestra = { d: 0, id: 0 };
  const prof = def.profundidad ?? 8;

  for (let py = 0; py < res; py++) {
    const v = ((py + 0.5) / res) * area;
    for (let px = 0; px < res; px++) {
      const u = ((px + 0.5) / res) * area;
      const i = py * res + px;
      const x = mod(u * def.sx + muestrear(R.warpX, u, v) * def.irregular, def.sx);
      const y = mod(v * def.sy + muestrear(R.warpY, u, v) * def.irregular, def.sy);
      def.patron(x, y, m);

      const borde = suave(def.junta * ESCALA_JUNTA, (def.junta + def.bisel) * ESCALA_JUNTA, m.d);
      const azar = hash2(m.id, 977);
      const sup = def.veta
        ? muestrear(R.superficie, u, v * 8) * 0.55 + muestrear(R.grano, u, v * 16) * 0.45
        : muestrear(R.superficie, u, v);
      const grano = muestrear(R.grano, u * 2, v * 2);
      const nubes = muestrear(R.warpY, u * 3, v * 3);

      alt[i] = borde * prof + sup * def.relieve * 1.8 * borde + (azar - 0.5) * 0.9 * borde;
      const l = 0.9 + (azar - 0.5) * 0.16 + sup * 0.1 * def.relieve + grano * 0.05 + nubes * 0.07 - (1 - borde) * 0.16;
      lum[i] = Math.max(0, Math.min(255, l * 255));
      const k = (1 - borde) * 1.1 + Math.max(0, -sup) * 0.9 * def.relieve + 0.1;
      mascara[i] = Math.max(0, Math.min(255, k * 255));
    }
  }

  const normal = new Uint8Array(n * 4);
  const mmX = (def.sx * area * 1000) / res;
  const mmY = (def.sy * area * 1000) / res;
  const periodico = area === 1;
  const vecino = (c: number) => (periodico ? mod(c, res) : Math.min(res - 1, Math.max(0, c)));
  for (let py = 0; py < res; py++) {
    const arriba = vecino(py - 1) * res;
    const abajo = vecino(py + 1) * res;
    for (let px = 0; px < res; px++) {
      const i = py * res + px;
      const dx = (alt[py * res + vecino(px + 1)] - alt[py * res + vecino(px - 1)]) / (2 * mmX);
      const dy = (alt[abajo + px] - alt[arriba + px]) / (2 * mmY);
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const j = i * 4;
      normal[j] = (-dx * inv * 0.5 + 0.5) * 255;
      normal[j + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      normal[j + 2] = (inv * 0.5 + 0.5) * 255;
      normal[j + 3] = 255;
    }
  }

  return { res, lum, mascara, normal };
}

export function hexARgb(hex: string): RGB {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

// Mezcla color base y desmoldeante sobre la luminancia generada
export function componer(g: Generado, color: RGB, desmoldeante: RGB | null, destino: Uint8Array | Uint8ClampedArray, cantidad = 0.6) {
  const n = g.res * g.res;
  const [r0, g0, b0] = color;
  for (let i = 0; i < n; i++) {
    const l = g.lum[i] / 230;
    let r = r0 * l;
    let gg = g0 * l;
    let b = b0 * l;
    if (desmoldeante) {
      const t = (g.mascara[i] / 255) * cantidad;
      r += (desmoldeante[0] * l - r) * t;
      gg += (desmoldeante[1] * l - gg) * t;
      b += (desmoldeante[2] * l - b) * t;
    }
    const j = i * 4;
    destino[j] = r > 255 ? 255 : r;
    destino[j + 1] = gg > 255 ? 255 : gg;
    destino[j + 2] = b > 255 ? 255 : b;
    destino[j + 3] = 255;
  }
}

// Vista cenital sombreada para las miniaturas y el modo sin WebGL
export function miniatura(def: DefinicionMolde, color: RGB, desmoldeante: RGB | null, res: number, metros = 1.2): Uint8ClampedArray {
  const area = Math.min(1, metros / def.sx);
  const g = generar(def, res, area);
  const out = new Uint8ClampedArray(res * res * 4);
  componer(g, color, desmoldeante, out);
  const lx = -0.45;
  const ly = 0.55;
  const lz = 0.7;
  for (let i = 0; i < res * res; i++) {
    const j = i * 4;
    const nx = g.normal[j] / 127.5 - 1;
    const ny = g.normal[j + 1] / 127.5 - 1;
    const nz = g.normal[j + 2] / 127.5 - 1;
    const s = 0.55 + 0.55 * Math.max(0, nx * lx + ny * ly + nz * lz);
    out[j] *= s;
    out[j + 1] *= s;
    out[j + 2] *= s;
  }
  return out;
}
