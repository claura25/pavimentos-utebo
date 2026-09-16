import datos from './empresa.json';

// Los datos editables (teléfonos, dirección, zonas…) están en empresa.json
// para que se puedan cambiar desde el panel sin tocar código.

const aTelefono = (numero: string) => `tel:+34${numero.replace(/\D/g, '')}`;

export const empresa = {
  nombre: datos.nombre,
  razonSocial: datos.razonSocial,
  eslogan: datos.eslogan,
  direccion: datos.direccion,
  oficina: { texto: datos.telefonoOficina, href: aTelefono(datos.telefonoOficina) },
  movil: {
    texto: datos.telefonoMovil,
    href: aTelefono(datos.telefonoMovil),
    contacto: datos.contactoMovil,
  },
  whatsapp: `https://wa.me/${datos.whatsapp.replace(/\D/g, '')}`,
  email: datos.email,
  instagram: datos.instagram,
  mapa: datos.mapa,
  zonas: datos.zonas,
  // Dirección a la que se envía el formulario de presupuesto.
  // En Netlify basta con poner "/" para que lo recojan sus formularios.
  // Mientras esté vacía, el formulario abre el correo del visitante con los datos escritos.
  formulario: datos.formulario,
};

export const navegacion = [
  { texto: 'Servicios', href: '/servicios/' },
  { texto: 'Trabajos', href: '/trabajos/' },
  { texto: 'Moldes y colores', href: '/moldes-y-colores/' },
  { texto: 'Nosotros', href: '/quienes-somos/' },
  { texto: 'Contacto', href: '/contacto/' },
];
