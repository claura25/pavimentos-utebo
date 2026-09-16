# Web de Pavimentos Utebo

Web estática hecha con [Astro](https://astro.build). El contenido (servicios y trabajos) vive en archivos de
texto dentro de `src/content/`, y se edita desde el panel en `/admin/` sin tocar código.

## Trabajar con el proyecto

```bash
npm install
npm run dev      # servidor local en http://localhost:4321
npm run build    # genera la web en dist/
npm run preview  # ve el resultado del build
```

## Cómo está organizado

- `src/pages/` — páginas: inicio, servicios, trabajos, moldes y colores, quiénes somos, contacto y páginas legales.
- `src/content/servicios/` — un archivo `.md` por servicio (título, resumen, para qué sirve, foto y texto).
- `src/content/trabajos/` — un archivo `.md` por obra (título, localidad, fecha, servicio, detalles y fotos).
- `src/assets/` — fotos de obras y de servicios, optimizadas automáticamente al construir la web.
- `src/data/empresa.json` — teléfonos, dirección, correo, redes y zonas de trabajo. **Se edita aquí o en el panel.**
- `src/simulador/` — el simulador de pavimentos.
- `public/simulador/` — las fotos de las escenas del simulador, con su máscara de suelo y su mapa de luces.
- `src/pages/admin/` y `public/admin/` — el panel de contenidos (la página y su configuración).
- `herramientas/` — scripts para preparar escenas del simulador y copiar el panel.

## Panel de contenidos

Está en `/admin/` y usa [Sveltia CMS](https://github.com/sveltia/sveltia-cms). Permite crear y editar trabajos y
servicios, subir fotos y cambiar los datos de contacto. Guarda los cambios en el repositorio y la web se vuelve a
publicar sola.

**Probarlo en local (sin cuentas):** abre `http://localhost:4321/admin/` en Chrome o Edge, pulsa *Work with local
repository* y elige la carpeta del proyecto. Los cambios se guardan directamente en los archivos.

**Dejarlo listo para el cliente:**

1. Sube el proyecto a un repositorio de GitHub.
2. En `public/admin/config.yml`, pon ese repositorio en `repo:` (formato `usuario/repositorio`).
3. En Netlify: *Site configuration → Access control → OAuth → Install provider → GitHub* (es lo que permite entrar al
   panel con la cuenta de GitHub).
4. Da acceso al repositorio a la persona del cliente que vaya a publicar.

El archivo del panel (`public/admin/sveltia-cms.js`) se copia solo desde `node_modules` antes de cada `npm run dev` y
`npm run build`, así que no hace falta guardarlo en el repositorio.

## Publicar en Netlify

`netlify.toml` ya trae la orden de construcción, la carpeta a publicar y las redirecciones 301 de las direcciones
antiguas de WordPress.

1. Conecta el repositorio en Netlify (detecta la configuración solo).
2. Apunta el dominio `pavimentosutebo.es` a Netlify.
3. En `src/data/empresa.json`, pon `"formulario": "/"` para que los envíos del formulario los recoja Netlify
   (*Forms* en el panel de Netlify, con aviso por correo).

## Añadir un trabajo (sin panel)

1. Copia las fotos en `src/assets/trabajos/<nombre-de-la-obra>/`. En los archivos de contenido las fotos se escriben
   con su ruta completa desde el proyecto (`/src/assets/trabajos/…`), igual que las guarda el panel; el ayudante
   `src/data/imagenes.ts` se encarga de que Astro las optimice.
2. Crea `src/content/trabajos/<nombre-de-la-obra>.md` copiando uno existente y cambia los datos.
3. La obra aparece sola en la portada, en la página de trabajos y en la del servicio correspondiente.

## Añadir una escena al simulador

1. Elige una foto donde se vea bien el suelo y añádela a `ESC` en `herramientas/escenas.py`: ruta, distancia focal
   estimada, altura de la cámara, punto de fuga y el polígono del suelo (con los huecos de arquetas o pilares).
2. `python3 herramientas/escenas.py overlay` dibuja una rejilla de medio metro sobre la foto para comprobar que la
   perspectiva encaja. Los resultados quedan en `herramientas/revision/`.
3. `python3 herramientas/generar_escenas.py` genera la foto, la máscara y el mapa de luces en `public/simulador/`.
4. Añade la escena a `src/simulador/escenas.ts` con los valores que imprime el script.

## Pendiente antes de publicar

- Completar el NIF en el aviso legal y la política de privacidad, y que los revise la empresa.
- Confirmar el número de WhatsApp y las direcciones de Instagram y Facebook.
- Conseguir el logotipo en vectorial o en alta resolución.
- Crear el repositorio en GitHub y rellenar `repo:` en `public/admin/config.yml`.
- Conectar Netlify, apuntar el dominio y poner `"formulario": "/"`.
