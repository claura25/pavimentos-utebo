// Fotos reales de obras con su cámara estimada (px de la foto original).
// cabeceo: inclinación hacia abajo (rad); guinada: giro respecto al eje de la calle (rad);
// altura: altura de la cámara sobre el suelo (m); sol: dirección hacia la luz principal.

export interface Escena {
  id: string;
  nombre: string;
  foto: string;
  mascara: string;
  luz: string;
  ancho: number;
  alto: number;
  f: number;
  cx: number;
  cy: number;
  cabeceo: number;
  guinada: number;
  altura: number;
  distanciaMax: number;
  sol: [number, number, number];
  foco: [number, number];
}

export const escenas: Escena[] = [
  {
    id: 'calle',
    nombre: 'Calle',
    foto: '/simulador/calle.jpg',
    mascara: '/simulador/calle-mascara.png',
    luz: '/simulador/calle-luz.jpg',
    ancho: 1200,
    alto: 1600,
    f: 1156,
    cx: 600,
    cy: 800,
    cabeceo: 0.5055,
    guinada: -0.1503,
    altura: 0.85,
    distanciaMax: 24,
    sol: [0.55, 0.7, -0.45],
    foco: [0.5, 0.45],
  },
  {
    id: 'patio',
    nombre: 'Patio',
    foto: '/simulador/patio.jpg',
    mascara: '/simulador/patio-mascara.png',
    luz: '/simulador/patio-luz.jpg',
    ancho: 1600,
    alto: 1200,
    f: 1156,
    cx: 800,
    cy: 600,
    cabeceo: 0.4418,
    guinada: -0.0164,
    altura: 0.8,
    distanciaMax: 11,
    sol: [-0.6, 0.75, 0.1],
    foco: [0.5, 0.55],
  },
  {
    id: 'nave',
    nombre: 'Nave',
    foto: '/simulador/nave.jpg',
    mascara: '/simulador/nave-mascara.png',
    luz: '/simulador/nave-luz.jpg',
    ancho: 1000,
    alto: 750,
    f: 722,
    cx: 500,
    cy: 375,
    cabeceo: -0.0415,
    guinada: 0.076,
    altura: 1.3,
    distanciaMax: 60,
    sol: [0, 1, -0.3],
    foco: [0.5, 0.55],
  },
];
