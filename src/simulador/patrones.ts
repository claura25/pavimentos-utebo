// Patrones de moldes de hormigón impreso.
// Cada patrón recibe un punto (x, y) en metros dentro de la baldosa de textura
// y devuelve la distancia a la junta más cercana (d) y un identificador de pieza (id).
// Todos son periódicos respecto al tamaño de su baldosa para que la textura repita sin cortes.

export interface Muestra {
  d: number;
  id: number;
}

export type Patron = (x: number, y: number, m: Muestra) => void;

export interface DefinicionMolde {
  sx: number;
  sy: number;
  junta: number; // semiancho de la junta, en metros
  bisel: number; // ancho del canto redondeado, en metros
  irregular: number; // deformación de los bordes, en metros
  relieve: number; // intensidad de la textura superficial (0-1)
  profundidad?: number; // profundidad de junta, en mm
  veta?: boolean; // textura de madera
  patron: Patron;
}

export const mod = (v: number, p: number) => ((v % p) + p) % p;

export function hash2(a: number, b: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 1013904223, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function aleatorio(semilla: number) {
  let s = semilla >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

// Hileras de piezas rectangulares (adoquines, losas, traviesas)
export function hileras(sx: number, alto: number, filas: number, largos: number[], semilla: number, desfase?: number): Patron {
  const r = aleatorio(semilla);
  const minimo = Math.min(...largos);
  const tabla = Array.from({ length: filas }, (_, f) => {
    const cortes = [0];
    if (largos.length === 1) {
      const n = Math.round(sx / largos[0]);
      for (let i = 1; i <= n; i++) cortes.push((i * sx) / n);
    } else {
      let x = 0;
      while (sx - x > 1e-6) {
        const resto = sx - x;
        let l = largos[Math.floor(r() * largos.length)];
        if (resto - l < minimo - 1e-6) l = resto;
        x += l;
        cortes.push(Math.min(x, sx));
      }
    }
    return { cortes, desfase: desfase !== undefined ? (f % 2) * desfase : r() * sx };
  });

  return (x, y, m) => {
    const f = Math.floor(y / alto);
    const fila = tabla[mod(f, filas)];
    const yy = y - f * alto;
    const xx = mod(x + fila.desfase, sx);
    const c = fila.cortes;
    let i = 1;
    while (i < c.length - 1 && c[i] <= xx) i++;
    m.d = Math.min(yy, alto - yy, xx - c[i - 1], c[i] - xx);
    m.id = mod(f, filas) * 131 + i;
  };
}

// Espiga de pez: ladrillos 2:1 en zigzag. Periodo de 4 anchos en ambos ejes.
export function espiga(w: number, unidades: number): Patron {
  return (x, y, m) => {
    const u = x / w;
    const v = y / w;
    const s0 = Math.floor((u + v) / 2);
    const t0 = Math.floor((u - v) / 4);
    for (let ds = -1; ds <= 1; ds++) {
      for (let dt = -1; dt <= 1; dt++) {
        const S = s0 + ds;
        const T = t0 + dt;
        const ox = S + 2 * T;
        const oy = S - 2 * T;
        if (u >= ox && u < ox + 2 && v >= oy && v < oy + 1) {
          m.d = Math.min(u - ox, ox + 2 - u, v - oy, oy + 1 - v) * w;
          m.id = (mod(ox, unidades) * unidades + mod(oy, unidades)) * 2;
          return;
        }
        if (u >= ox - 1 && u < ox && v >= oy && v < oy + 2) {
          m.d = Math.min(u - ox + 1, ox - u, v - oy, oy + 2 - v) * w;
          m.id = (mod(ox, unidades) * unidades + mod(oy, unidades)) * 2 + 1;
          return;
        }
      }
    }
    m.d = 0;
    m.id = 0;
  };
}

// Cesta: bloques de dos ladrillos alternando orientación
export function cesta(w: number, bloques: number): Patron {
  const b = 2 * w;
  return (x, y, m) => {
    const bx = Math.floor(x / b);
    const by = Math.floor(y / b);
    const lx = x - bx * b;
    const ly = y - by * b;
    const horizontal = mod(bx + by, 2) === 0;
    const q = horizontal ? ly : lx;
    const k = Math.min(1, Math.floor(q / w));
    const local = q - k * w;
    m.d = Math.min(lx, b - lx, ly, b - ly, local, w - local);
    m.id = (mod(bx, bloques) * bloques + mod(by, bloques)) * 2 + k;
  };
}

// Panel de abeja: hexágonos de lado R
export function hexagonos(R: number, columnas: number, filas: number): Patron {
  const h = Math.sqrt(3) * R;
  const apotema = h / 2;
  const dx = 1.5 * R;
  return (x, y, m) => {
    const c0 = Math.round(x / dx);
    let mejor = 1e9;
    let id = 0;
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      const off = mod(c, 2) === 1 ? h / 2 : 0;
      const r0 = Math.round((y - off) / h);
      for (let r = r0 - 1; r <= r0 + 1; r++) {
        const qx = Math.abs(x - c * dx);
        const qy = Math.abs(y - (r * h + off));
        const sdf = Math.max(qy, qx * 0.8660254 + qy * 0.5) - apotema;
        if (sdf < mejor) {
          mejor = sdf;
          id = mod(c, columnas) * filas + mod(r, filas);
        }
      }
    }
    m.d = -mejor;
    m.id = id;
  };
}

// Molde de flor: octógonos con pequeños cuadrados entre ellos
export function octogonos(a: number, celdas: number): Patron {
  const medio = a / 2;
  return (x, y, m) => {
    const cx = Math.floor(x / a);
    const cy = Math.floor(y / a);
    const rx = x - (cx + 0.5) * a;
    const ry = y - (cy + 0.5) * a;
    const qx = Math.abs(rx);
    const qy = Math.abs(ry);
    const sdf = Math.max(qx, qy, (qx + qy) * 0.70710678) - medio;
    if (sdf <= 0) {
      m.d = -sdf;
      m.id = mod(cx, celdas) * celdas + mod(cy, celdas);
    } else {
      m.d = sdf;
      const kx = cx + (rx > 0 ? 1 : 0);
      const ky = cy + (ry > 0 ? 1 : 0);
      m.id = 10000 + mod(kx, celdas) * celdas + mod(ky, celdas);
    }
  };
}

// Piedra de cantera: losas irregulares (Voronoi periódico)
export function cantera(n: number, lado: number, semilla = 3): Patron {
  const cs = lado / n;
  const px = new Float64Array(n * n);
  const py = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      px[i * n + j] = (i + 0.5 + (hash2(i * 7 + semilla, j * 13) - 0.5) * 0.8) * cs;
      py[i * n + j] = (j + 0.5 + (hash2(i * 17, j * 5 + semilla) - 0.5) * 0.8) * cs;
    }
  }
  const cx = new Float64Array(25);
  const cy = new Float64Array(25);
  return (x, y, m) => {
    const ci = Math.floor(x / cs);
    const cj = Math.floor(y / cs);
    let t = 0;
    let mejor = 1e9;
    let elegido = 0;
    let id = 0;
    for (let di = -2; di <= 2; di++) {
      for (let dj = -2; dj <= 2; dj++) {
        const I = ci + di;
        const J = cj + dj;
        const k = mod(I, n) * n + mod(J, n);
        const fx = px[k] + (I - mod(I, n)) * cs;
        const fy = py[k] + (J - mod(J, n)) * cs;
        cx[t] = fx;
        cy[t] = fy;
        const d2 = (fx - x) ** 2 + (fy - y) ** 2;
        if (d2 < mejor) {
          mejor = d2;
          elegido = t;
          id = k;
        }
        t++;
      }
    }
    const f1x = cx[elegido];
    const f1y = cy[elegido];
    let d = 1e9;
    for (let k = 0; k < t; k++) {
      if (k === elegido) continue;
      const nx = cx[k] - f1x;
      const ny = cy[k] - f1y;
      const len = Math.hypot(nx, ny);
      const e = (((f1x + cx[k]) / 2 - x) * nx + ((f1y + cy[k]) / 2 - y) * ny) / len;
      if (e < d) d = e;
    }
    m.d = d;
    m.id = id;
  };
}

// Piedra rectangular cerrada: aparejo de losas cuadradas y rectangulares
const LOSAS = [
  [0, 0, 4, 4],
  [4, 0, 2, 2],
  [6, 0, 2, 4],
  [4, 2, 2, 2],
  [0, 4, 2, 2],
  [2, 4, 2, 2],
  [0, 6, 4, 2],
  [4, 4, 4, 2],
  [4, 6, 2, 2],
  [6, 6, 2, 2],
];

export function aparejo(u: number, bloques: number): Patron {
  const B = 8 * u;
  return (x, y, m) => {
    const bx = Math.floor(x / B);
    const by = Math.floor(y / B);
    let lx = Math.min(7.9999, (x - bx * B) / u);
    let ly = Math.min(7.9999, (y - by * B) / u);
    const variante = Math.floor(hash2(mod(bx, bloques), mod(by, bloques) + 50) * 4);
    if (variante & 1) lx = 7.9999 - lx;
    if (variante & 2) ly = 7.9999 - ly;
    for (let k = 0; k < LOSAS.length; k++) {
      const [x0, y0, w, h] = LOSAS[k];
      if (lx >= x0 && lx < x0 + w && ly >= y0 && ly < y0 + h) {
        m.d = Math.min(lx - x0, x0 + w - lx, ly - y0, y0 + h - ly) * u;
        m.id = (mod(bx, bloques) * bloques + mod(by, bloques)) * 16 + k;
        return;
      }
    }
    m.d = 0;
    m.id = 0;
  };
}

// Adoquín abanico: arcos concéntricos solapados
export function abanico(R: number, columnas: number, filas: number): Patron {
  const W = 2 * R;
  const H = R * 0.75;
  const anillos = 3;
  const ancho = R / anillos;
  const segmentos = [2, 5, 8];
  return (x, y, m) => {
    const jmin = Math.ceil((y - R) / H);
    const jmax = Math.floor((y + R) / H);
    let borde = 1e9;
    for (let j = jmin; j <= jmax; j++) {
      const off = mod(j, 2) === 1 ? R : 0;
      const i0 = Math.round((x - off) / W);
      for (let i = i0 - 1; i <= i0 + 1; i++) {
        const X = i * W + off;
        const Y = j * H;
        const r = Math.hypot(x - X, y - Y);
        if (r > R) {
          borde = Math.min(borde, r - R);
          continue;
        }
        const k = Math.min(anillos - 1, Math.floor(r / ancho));
        const radial = Math.min(k === 0 ? 1e9 : r - k * ancho, (k + 1) * ancho - r);
        const n = segmentos[k];
        const t = (Math.atan2(y - Y, x - X) / Math.PI) * n;
        const frac = t - Math.floor(t);
        const angular = Math.min(frac, 1 - frac) * (Math.PI / n) * r;
        m.d = Math.min(radial, k === 0 ? 1e9 : angular, borde);
        m.id = ((mod(i, columnas) * filas + mod(j, filas)) * 4 + k) * 32 + mod(Math.floor(t), 32);
        return;
      }
    }
    m.d = 0;
    m.id = 0;
  };
}

// Fratasado: superficie continua con juntas de dilatación
export function liso(lado: number): Patron {
  return (x, y, m) => {
    m.d = Math.min(x, lado - x, y, lado - y);
    m.id = 0;
  };
}
