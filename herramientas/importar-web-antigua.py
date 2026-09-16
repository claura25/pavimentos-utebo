"""Importa las obras de la web antigua (WordPress) a la web nueva.

  python3 herramientas/importar-web-antigua.py recuento   # solo cuenta, no descarga
  python3 herramientas/importar-web-antigua.py importar   # descarga fotos y crea los trabajos
"""
import html, json, os, re, sys, urllib.request

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
BASE = 'https://www.pavimentosutebo.es'
CABECERA = {'User-Agent': 'Mozilla/5.0'}
MESES = {m: i + 1 for i, m in enumerate(
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])}

# Palabras del título -> servicio de la web nueva
SERVICIOS = [
    ('autonivelante', 'morteros-autonivelantes'),
    ('epoxi', 'resinas-epoxi'),
    ('microcemento', 'microcemento'),
    ('poliuretano', 'poliuretano'),
    ('pumptrack', 'pistas-deportivas'),
    ('pista bmx', 'pistas-deportivas'),
    ('pista de skate', 'pistas-deportivas'),
    ('pista de tenis', 'pistas-deportivas'),
    ('polideportivo', 'pistas-deportivas'),
    ('pista', 'pistas-deportivas'),
    ('litio', 'hormigon-pulido'),
    ('lavado y resinado', 'hormigon-impreso'),
    ('lavado', 'hormigon-lavado'),
    ('arido visto', 'hormigon-lavado'),
    ('semipulida', 'fratasado'),
    ('semipulido', 'fratasado'),
    ('fratasad', 'fratasado'),
    ('pulido', 'hormigon-pulido'),
    ('planimetria', 'hormigon-pulido'),
    ('impreso', 'hormigon-impreso'),
]
SIN_LOCALIDAD = {'particular', 'particulares', 'calles', 'obra'}


def bajar(url, binario=False):
    datos = urllib.request.urlopen(urllib.request.Request(url, headers=CABECERA), timeout=60).read()
    return datos if binario else datos.decode('utf-8', 'ignore')


def limpiar(texto):
    return html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', texto))).strip()


def listar_obras():
    slugs, pagina = [], 1
    while True:
        url = f'{BASE}/trabajos-realizados/' if pagina == 1 else f'{BASE}/trabajos-realizados/page/{pagina}/'
        try:
            pag = bajar(url)
        except Exception:
            break
        nuevos = [s for s in re.findall(r'href="' + BASE + r'/([a-z0-9-]+)/"', pag)
                  if s not in slugs and s not in {'trabajos-realizados', 'contacto', 'servicios', 'colores',
                                                  'moldes', 'glosario', 'quienes-somos', 'mapa-web', 'aviso-legal',
                                                  'politica-de-privacidad', 'politica-de-cookies', 'feed',
                                                  'mas-informacion-sobre-las-cookies', 'impreso', 'category'}]
        if not nuevos:
            break
        slugs += nuevos
        pagina += 1
    return slugs


def leer_obra(slug):
    pag = bajar(f'{BASE}/{slug}/')
    titulo = limpiar(re.search(r'<h1[^>]*>(.*?)</h1>', pag, re.S).group(1)) if re.search(r'<h1[^>]*>(.*?)</h1>', pag, re.S) else slug
    fecha = None
    m = re.search(r'el ([A-Z][a-z]{2}) (\d{1,2}), (\d{4})', limpiar(pag))
    if m:
        fecha = f'{m.group(3)}-{MESES[m.group(1)]:02d}-{int(m.group(2)):02d}'
    fotos = []
    for u in re.findall(r'https://www\.pavimentosutebo\.es/wp-content/uploads/[^\s"\']+?\.(?:jpg|jpeg|png)', pag):
        completa = re.sub(r'-\d+x\d+(\.\w+)$', r'\1', u)
        if completa not in fotos:
            fotos.append(completa)
    cuerpo = limpiar(re.search(r'(?is)<div[^>]*class="[^"]*entry[^"]*"[^>]*>(.*?)</div>', pag).group(1)) if re.search(r'(?is)<div[^>]*class="[^"]*entry[^"]*"[^>]*>(.*?)</div>', pag) else ''
    return {'slug': slug, 'titulo': titulo, 'fecha': fecha, 'fotos': fotos, 'texto': cuerpo}


def servicio_de(titulo):
    t = titulo.lower()
    for palabra, servicio in SERVICIOS:
        if palabra in t:
            return servicio
    return 'hormigon-impreso'


PEQUENAS = {'de', 'del', 'en', 'el', 'la', 'los', 'las', 'y', 'para', 'con', 'a', 'al', 'por'}
PREFIJOS = ('calle ', 'calles ', 'camino ', 'poligono ', 'polígono ', 'avenida ', 'plaza ')
PALABRAS_NO_LUGAR = {'color', 'colores', 'molde', 'moldes', 'particular', 'particulares', 'obra',
                     'fase', 'muestras', 'diferentes', 'seco', 'fresco'}


ROMANOS = re.compile(r'^(?:I{1,3}|IV|V|VI{0,3}|IX|X)$')
SIGLAS = {'BMX', 'HD', 'MC', 'M2', 'OK'}


def _capitalizar(palabra):
    return re.sub(r'[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+', lambda m: m.group(0).capitalize(), palabra)


def titulo_bonito(titulo):
    if not titulo.isupper():
        return titulo
    palabras = []
    for i, p in enumerate(titulo.split()):
        limpio = p.strip('()')
        bajo = p.lower()
        if i and bajo in PEQUENAS:
            palabras.append(bajo)
        elif any(ch.isdigit() for ch in p) or ROMANOS.match(limpio) or limpio in SIGLAS:
            palabras.append(p)
        else:
            palabras.append(_capitalizar(p))
    return ' '.join(palabras)


def localidad_de(titulo):
    m = re.search(r'\ben\s+(.+)$', titulo, re.I)
    if not m:
        return None
    sitio = re.split(r'\s+(?:para|con|y)\s+', m.group(1).strip(' .'), 1)[0].strip()
    bajo = sitio.lower()
    for prefijo in PREFIJOS:
        if bajo.startswith(prefijo):
            sitio = re.sub(r'^(?:de\s+)?', '', sitio[len(prefijo):], flags=re.I).strip()
            bajo = sitio.lower()
    if not sitio or len(sitio) > 40 or any(p in bajo.split() for p in PALABRAS_NO_LUGAR):
        return None
    return titulo_bonito(sitio) if sitio.isupper() else sitio


def texto_limpio(texto):
    return texto.split('en Galería de trabajos realizados')[-1].strip()


def detalles_de(texto):
    partes = []
    for etiqueta in ('COLOR', 'COLORES', 'MOLDE', 'MOLDES'):
        for m in re.finditer(etiqueta + r'\s*:?\s*([^:]{3,60}?)(?=\s+(?:COLOR|COLORES|MOLDE|MOLDES)\b|$)', texto):
            valor = m.group(1).strip(' -–.')
            if valor and len(valor) < 60:
                partes.append(f'{etiqueta.capitalize()}: {titulo_bonito(valor) if valor.isupper() else valor}')
    vistos, unicos = set(), []
    for p in partes:
        if p.lower() not in vistos:
            vistos.add(p.lower())
            unicos.append(p)
    return unicos[:4]


def yaml(valor):
    return '"' + valor.replace('"', "'") + '"' if re.search(r'[:#"\']', valor) else valor


def importar():
    import concurrent.futures
    from PIL import Image, ImageOps
    obras = json.load(open(os.path.join(RAIZ, 'herramientas', 'obras-antiguas.json')))
    carpeta_contenido = os.path.join(RAIZ, 'src', 'content', 'trabajos')
    existentes = {f[:-3] for f in os.listdir(carpeta_contenido) if f.endswith('.md')}
    total_fotos = 0
    for n, obra in enumerate(obras, 1):
        slug = obra['slug']
        if slug in existentes:
            print(f'[{n}/{len(obras)}] (ya estaba) {slug}', flush=True)
            continue
        destino = os.path.join(RAIZ, 'src', 'assets', 'trabajos', slug)
        os.makedirs(destino, exist_ok=True)

        def guardar(par):
            i, url = par
            ruta_foto = os.path.join(destino, f'{i}.jpg')
            if os.path.exists(ruta_foto):
                return ruta_foto
            try:
                bruto = bajar(url, True)
                tmp = ruta_foto + '.tmp'
                open(tmp, 'wb').write(bruto)
                im = ImageOps.exif_transpose(Image.open(tmp)).convert('RGB')
                im.thumbnail((1400, 1400))
                im.save(ruta_foto, quality=82, optimize=True, progressive=True)
                os.remove(tmp)
                return ruta_foto
            except Exception as e:
                print('   foto con problemas:', url.split('/')[-1], e, flush=True)
                return None

        with concurrent.futures.ThreadPoolExecutor(8) as pool:
            rutas = list(pool.map(guardar, enumerate(obra['fotos'], 1)))
        fotos = [f'/src/assets/trabajos/{slug}/{os.path.basename(r)}' for r in rutas if r]
        if not fotos:
            print(f'[{n}/{len(obras)}] SIN FOTOS, se omite: {slug}', flush=True)
            continue
        total_fotos += len(fotos)

        titulo = titulo_bonito(obra['titulo'])
        localidad = localidad_de(obra['titulo'])
        detalles = detalles_de(texto_limpio(obra['texto']))
        lineas = ['---', f'titulo: {yaml(titulo)}']
        if localidad:
            lineas.append(f'localidad: {yaml(localidad)}')
        lineas.append(f"fecha: {obra['fecha'] or '2014-01-01'}")
        lineas.append('servicio: ' + servicio_de(obra['titulo']))
        if detalles:
            lineas.append('detalles:')
            lineas += [f'  - {yaml(d)}' for d in detalles]
        lineas.append(f'portada: {fotos[0]}')
        lineas.append('galeria:')
        lineas += [f'  - {f}' for f in fotos]
        lineas += ['destacado: false', '---', '']
        open(os.path.join(carpeta_contenido, f'{slug}.md'), 'w').write('\n'.join(lineas))
        print(f'[{n}/{len(obras)}] {titulo} — {len(fotos)} fotos', flush=True)
    print(f'\nImportación terminada. Fotos nuevas: {total_fotos}')


def main():
    modo = sys.argv[1] if len(sys.argv) > 1 else 'recuento'
    if modo == 'importar':
        importar()
        return
    slugs = listar_obras()
    obras = []
    for s in slugs:
        try:
            obras.append(leer_obra(s))
        except Exception as e:
            print('  (no se pudo leer)', s, e)
    total_fotos = sum(len(o['fotos']) for o in obras)
    print(f'\nObras encontradas: {len(obras)}   Fotos: {total_fotos}\n')
    for o in obras:
        print(f"{o['fecha'] or '????-??-??'}  {len(o['fotos']):3d} fotos  {servicio_de(o['titulo']):22s} {o['titulo'][:52]}")
    json.dump(obras, open(os.path.join(RAIZ, 'herramientas', 'obras-antiguas.json'), 'w'), ensure_ascii=False, indent=1)
    print('\nListado guardado en herramientas/obras-antiguas.json')


if __name__ == '__main__':
    main()
