import { abanico, aparejo, cantera, cesta, espiga, hexagonos, hileras, liso, octogonos, type DefinicionMolde } from './patrones';

export interface Color {
  nombre: string;
  codigo: string;
  hex: string;
}

export interface Molde {
  id: string;
  nombre: string;
  codigo: string;
  medida: string;
  def: DefinicionMolde;
}

export interface Desmoldeante {
  id: string;
  nombre: string;
  hex: string | null;
}

// Tonos tomados de la carta de colores (foto). Son orientativos.
export const colores: Color[] = [
  { nombre: 'Plata', codigo: '103', hex: '#b7ada7' },
  { nombre: 'Pizarra', codigo: '102', hex: '#8c8482' },
  { nombre: 'Negro', codigo: '101', hex: '#554f4d' },
  { nombre: 'Azabache', codigo: '127', hex: '#4b474a' },
  { nombre: 'Blanco', codigo: '115', hex: '#ece8dc' },
  { nombre: 'Duna', codigo: '125', hex: '#ecd6b6' },
  { nombre: 'Crema', codigo: '113', hex: '#e6c49c' },
  { nombre: 'Roble', codigo: '112', hex: '#cfab8a' },
  { nombre: 'Oro', codigo: '123', hex: '#e4b679' },
  { nombre: 'Corcho', codigo: '122', hex: '#c9966b' },
  { nombre: 'Tostado', codigo: '107', hex: '#ad825d' },
  { nombre: 'Barro', codigo: '121', hex: '#9b755a' },
  { nombre: 'Marrón', codigo: '106', hex: '#9b735c' },
  { nombre: 'Arcilla', codigo: '104', hex: '#99624e' },
  { nombre: 'Nogal', codigo: '105', hex: '#7b5e53' },
  { nombre: 'Verde', codigo: '110', hex: '#7c846b' },
  { nombre: 'Salmón', codigo: '124', hex: '#df9675' },
  { nombre: 'Cuero', codigo: '119', hex: '#96563f' },
  { nombre: 'Rojo', codigo: '111', hex: '#924035' },
  { nombre: 'Rojo vino', codigo: '118', hex: '#7a483c' },
];

export const moldes: Molde[] = [
  {
    id: 'adoquin-romano',
    nombre: 'Adoquín romano',
    codigo: 'HD-0083-R',
    medida: '120 × 67 cm',
    def: { sx: 2.4, sy: 2.4, junta: 0.006, bisel: 0.012, irregular: 0.012, relieve: 0.8, profundidad: 9, patron: hileras(2.4, 0.16, 15, [0.12, 0.16, 0.2, 0.24], 11) },
  },
  {
    id: 'adoquin-ingles',
    nombre: 'Adoquín inglés',
    codigo: 'HD-0002-AZ',
    medida: '76 × 43,5 cm',
    def: { sx: 2.4, sy: 2.4, junta: 0.006, bisel: 0.01, irregular: 0.008, relieve: 0.7, patron: hileras(2.4, 0.12, 20, [0.16], 5, 0.08) },
  },
  {
    id: 'espiga-de-pez',
    nombre: 'Espiga de pez',
    codigo: 'HD-5000-R',
    medida: '93 × 64 cm',
    def: { sx: 2.4, sy: 2.4, junta: 0.005, bisel: 0.008, irregular: 0.004, relieve: 0.5, patron: espiga(0.1, 24) },
  },
  {
    id: 'molde-ladrillo',
    nombre: 'Ladrillo',
    codigo: 'HD-3600-AZ',
    medida: '91,5 × 61 cm',
    def: { sx: 2.4, sy: 2.4, junta: 0.005, bisel: 0.008, irregular: 0.004, relieve: 0.5, patron: cesta(0.1, 12) },
  },
  {
    id: 'adoquin-abanico',
    nombre: 'Adoquín abanico',
    codigo: 'HD-0001-R',
    medida: '81 × 45 cm',
    def: { sx: 2.4, sy: 2.4, junta: 0.006, bisel: 0.01, irregular: 0.008, relieve: 0.7, patron: abanico(0.4, 3, 8) },
  },
  {
    id: 'piedra-inglesa',
    nombre: 'Piedra inglesa',
    codigo: 'HD-1500',
    medida: '91 × 46 cm',
    def: { sx: 2.4, sy: 2.4, junta: 0.006, bisel: 0.01, irregular: 0.006, relieve: 1, patron: hileras(2.4, 0.4, 6, [0.4, 0.6], 21) },
  },
  {
    id: 'piedra-de-cantera',
    nombre: 'Piedra de cantera',
    codigo: 'HD-0006-AZ',
    medida: '74 × 74 cm',
    def: { sx: 2.4, sy: 2.4, junta: 0.007, bisel: 0.012, irregular: 0.02, relieve: 1, patron: cantera(6, 2.4) },
  },
  {
    id: 'piedra-rectangular',
    nombre: 'Piedra rectangular cerrada',
    codigo: 'HD-0005-R',
    medida: '59 × 59 cm',
    def: { sx: 2.4, sy: 2.4, junta: 0.006, bisel: 0.01, irregular: 0.006, relieve: 0.9, patron: aparejo(0.1, 3) },
  },
  {
    id: 'traviesa-de-tren',
    nombre: 'Traviesa de tren',
    codigo: 'MC-11-AZ',
    medida: '124 × 50 cm',
    def: { sx: 2.4, sy: 2.4, junta: 0.006, bisel: 0.008, irregular: 0.003, relieve: 0.8, veta: true, patron: hileras(2.4, 0.2, 12, [1.2, 0.8, 0.6], 8) },
  },
  {
    id: 'panel-de-abeja',
    nombre: 'Panel de abeja',
    codigo: 'HD-0040-R',
    medida: '76 × 80 cm',
    def: { sx: 2.52, sy: Math.sqrt(3) * 0.14 * 10, junta: 0.006, bisel: 0.01, irregular: 0.005, relieve: 0.6, patron: hexagonos(0.14, 12, 10) },
  },
  {
    id: 'molde-de-flor',
    nombre: 'Molde de flor',
    codigo: 'HD-0069-AR',
    medida: '78 × 78 cm',
    def: { sx: 2.4, sy: 2.4, junta: 0.006, bisel: 0.01, irregular: 0.004, relieve: 0.6, patron: octogonos(0.3, 8) },
  },
  {
    id: 'fratasado',
    nombre: 'Fratasado liso',
    codigo: 'Sin molde',
    medida: 'Juntas cada 3,2 m',
    def: { sx: 3.2, sy: 3.2, junta: 0.003, bisel: 0.003, irregular: 0, relieve: 0.25, profundidad: 5, patron: liso(3.2) },
  },
];

export const desmoldeantes: Desmoldeante[] = [
  { id: 'ninguno', nombre: 'Sin desmoldeante', hex: null },
  { id: 'pizarra', nombre: 'Pizarra', hex: '#5e5d5b' },
  { id: 'negro', nombre: 'Negro', hex: '#2e2c2a' },
  { id: 'marron', nombre: 'Marrón', hex: '#5b4330' },
  { id: 'blanco', nombre: 'Blanco', hex: '#e4ded2' },
];

export const inicial = { color: '112', molde: 'adoquin-romano', desmoldeante: 'ninguno' };
