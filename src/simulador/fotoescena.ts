import * as THREE from 'three';
import type { DefinicionMolde } from './patrones';
import type { Escena } from './escenas';
import { componer, generar, hexARgb, type Generado, type RGB } from './texturas';

// Simulador fotorrealista: sobre una foto real se sustituye el suelo por el molde elegido.
// Cada píxel del suelo se proyecta al plano del terreno con la cámara estimada de la foto,
// se ilumina con el relieve del molde y se multiplica por la luz y las sombras de la propia foto.

const DURACION_BARRIDO = 1300;

export interface Simulador {
  setCombinacion(molde: string, color: string, desmoldeante: string | null): void;
  setEscena(id: string): void;
  destruir(): void;
}

const vertice = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmento = /* glsl */ `
  precision highp float;
  uniform sampler2D uFoto;
  uniform sampler2D uMascara;
  uniform sampler2D uLuz;
  uniform sampler2D uAlbA;
  uniform sampler2D uNorA;
  uniform sampler2D uAlbB;
  uniform sampler2D uNorB;
  uniform vec2 uEscA;
  uniform vec2 uEscB;
  uniform vec2 uVista;
  uniform vec2 uCentro;
  uniform vec2 uTam;
  uniform vec2 uPrincipal;
  uniform float uF;
  uniform float uAltura;
  uniform float uDistMax;
  uniform float uBarrido;
  uniform float uConBarrido;
  uniform mat3 uRot;
  uniform vec3 uSol;
  varying vec2 vUv;

  vec3 aLineal(vec3 c) { return pow(c, vec3(2.2)); }
  vec3 aSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

  void main() {
    vec2 p = uCentro + (vUv - 0.5) * vec2(uVista.x, -uVista.y);
    vec2 t = vec2(p.x / uTam.x, 1.0 - p.y / uTam.y);
    vec3 foto = texture2D(uFoto, t).rgb;
    float m = texture2D(uMascara, t).r;

    vec3 rayo = uRot * normalize(vec3((p.x - uPrincipal.x) / uF, -(p.y - uPrincipal.y) / uF, -1.0));
    float bajada = min(rayo.y, -0.002);
    vec2 suelo = vec2(rayo.x, -rayo.z) * (uAltura / -bajada);
    m *= step(rayo.y, -0.002) * (1.0 - smoothstep(uDistMax * 0.7, uDistMax, suelo.y));

    float nuevo = uConBarrido * (1.0 - smoothstep(uBarrido - 0.3, uBarrido + 0.3, suelo.y));
    vec2 ua = suelo * uEscA;
    vec2 ub = suelo * uEscB;
    vec3 alb = mix(texture2D(uAlbA, ua).rgb, texture2D(uAlbB, ub).rgb, nuevo);
    vec3 nt = mix(texture2D(uNorA, ua).rgb, texture2D(uNorB, ub).rgb, nuevo) * 2.0 - 1.0;
    vec3 n = normalize(vec3(nt.x, nt.z, -nt.y));

    vec3 luz = aLineal(texture2D(uLuz, t).rgb) * 1.5;
    float alSol = clamp((dot(luz, vec3(0.3333)) - 0.3) / 0.45, 0.0, 1.0);
    float lambert = max(dot(n, uSol), 0.0) / max(uSol.y, 0.25);
    float relieve = mix(mix(1.0, lambert, 0.45), lambert, alSol);
    float brillo = pow(max(dot(n, normalize(uSol - rayo)), 0.0), 60.0) * 0.1 * alSol;

    vec3 color = aSrgb(aLineal(alb) * luz * relieve + brillo * luz);
    color += uConBarrido * exp(-pow((suelo.y - uBarrido) / 0.15, 2.0)) * 0.06;
    gl_FragColor = vec4(mix(foto, color, m), 1.0);
  }
`;

interface Capa {
  albedo: THREE.DataTexture;
  normal: THREE.DataTexture;
  gen: Generado | null;
  molde: string;
}

export function crearSimulador(
  canvas: HTMLCanvasElement,
  moldes: Record<string, DefinicionMolde>,
  escenas: Escena[],
  inicial: { escena: string; molde: string; color: string; desmoldeante: string | null },
  eventos: { alListo?: () => void; alCargar?: (cargando: boolean) => void } = {},
): Simulador {
  const movil = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
  const RES = movil ? 512 : 1024;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const aniso = renderer.capabilities.getMaxAnisotropy();

  const datos = () => {
    const t = new THREE.DataTexture(new Uint8Array(RES * RES * 4), RES, RES, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = aniso;
    t.needsUpdate = true;
    return t;
  };
  const capas: Capa[] = [0, 1].map(() => ({ albedo: datos(), normal: datos(), gen: null, molde: '' }));

  const vacia = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  vacia.needsUpdate = true;

  const uniforms = {
    uFoto: { value: vacia as THREE.Texture },
    uMascara: { value: vacia as THREE.Texture },
    uLuz: { value: vacia as THREE.Texture },
    uAlbA: { value: capas[0].albedo },
    uNorA: { value: capas[0].normal },
    uAlbB: { value: capas[1].albedo },
    uNorB: { value: capas[1].normal },
    uEscA: { value: new THREE.Vector2(1, 1) },
    uEscB: { value: new THREE.Vector2(1, 1) },
    uVista: { value: new THREE.Vector2(1, 1) },
    uCentro: { value: new THREE.Vector2() },
    uTam: { value: new THREE.Vector2(1, 1) },
    uPrincipal: { value: new THREE.Vector2() },
    uF: { value: 1 },
    uAltura: { value: 1.6 },
    uDistMax: { value: 30 },
    uBarrido: { value: 0 },
    uConBarrido: { value: 0 },
    uRot: { value: new THREE.Matrix3() },
    uSol: { value: new THREE.Vector3(0, 1, 0) },
  };

  const escena = new THREE.Scene();
  const plano = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ vertexShader: vertice, fragmentShader: fragmento, uniforms, depthTest: false }),
  );
  plano.frustumCulled = false;
  escena.add(plano);
  const camara = new THREE.OrthographicCamera();

  // Texturas de moldes (worker)
  const cache = new Map<string, Generado>();
  const promesas = new Map<string, Promise<Generado>>();
  const pendientes = new Map<string, (g: Generado) => void>();
  const MAXIMO = movil ? 6 : 12;
  let trabajador: Worker | null = null;
  try {
    trabajador = new Worker(new URL('./trabajador.ts', import.meta.url), { type: 'module' });
    trabajador.onmessage = (e: MessageEvent<{ id: string; g: Generado }>) => pendientes.get(e.data.id)?.(e.data.g);
    trabajador.onerror = () => {
      trabajador = null;
      for (const [id, resolver] of pendientes) resolver(generar(moldes[id], RES));
    };
  } catch {
    trabajador = null;
  }

  const guardar = (id: string, g: Generado) => {
    cache.delete(id);
    cache.set(id, g);
    while (cache.size > MAXIMO) cache.delete(cache.keys().next().value as string);
  };

  const obtener = (id: string): Promise<Generado> => {
    const g = cache.get(id);
    if (g) {
      guardar(id, g);
      return Promise.resolve(g);
    }
    let p = promesas.get(id);
    if (!p) {
      p = new Promise<Generado>((resolve) => {
        const resolver = (gen: Generado) => {
          pendientes.delete(id);
          promesas.delete(id);
          guardar(id, gen);
          resolve(gen);
        };
        if (trabajador) {
          pendientes.set(id, resolver);
          trabajador.postMessage({ id, res: RES });
        } else {
          setTimeout(() => resolver(generar(moldes[id], RES)), 0);
        }
      });
      promesas.set(id, p);
    }
    return p;
  };

  let color: RGB = hexARgb(inicial.color);
  let desmoldeante: RGB | null = inicial.desmoldeante ? hexARgb(inicial.desmoldeante) : null;
  let activo = 0;
  let moldePedido = '';
  let sueloListo = false;
  let escenaLista = false;

  let pedirRender = true;
  const repintar = () => {
    pedirRender = true;
  };

  const pintar = (c: Capa) => {
    if (!c.gen) return;
    componer(c.gen, color, desmoldeante, c.albedo.image.data as Uint8Array);
    c.albedo.needsUpdate = true;
    repintar();
  };

  const cargarCapa = (c: Capa, id: string, g: Generado) => {
    c.gen = g;
    c.molde = id;
    (c.normal.image.data as Uint8Array).set(g.normal);
    c.normal.needsUpdate = true;
    pintar(c);
    repintar();
  };

  const enlazar = () => {
    const a = capas[activo];
    const b = capas[1 - activo];
    uniforms.uAlbA.value = a.albedo;
    uniforms.uNorA.value = a.normal;
    uniforms.uAlbB.value = b.albedo;
    uniforms.uNorB.value = b.normal;
    const da = moldes[a.molde];
    const db = moldes[b.molde];
    if (da) uniforms.uEscA.value.set(1 / da.sx, 1 / da.sy);
    if (db) uniforms.uEscB.value.set(1 / db.sx, 1 / db.sy);
  };

  let barrido: number | null = null;
  const terminarBarrido = () => {
    if (barrido === null) return;
    activo = 1 - activo;
    barrido = null;
    uniforms.uConBarrido.value = 0;
    enlazar();
  };

  let precalculando = false;
  const precalcular = () => {
    if (movil || precalculando) return;
    precalculando = true;
    const siguiente = () => {
      const id = Object.keys(moldes).find((k) => !cache.has(k));
      if (id) obtener(id).then(() => setTimeout(siguiente, 30));
    };
    siguiente();
  };

  let turno = 0;
  const cambiarMolde = (id: string) => {
    if (id === moldePedido || !moldes[id]) return;
    moldePedido = id;
    const este = ++turno;
    obtener(id).then((g) => {
      if (este !== turno) return;
      if (!sueloListo) {
        cargarCapa(capas[activo], id, g);
        sueloListo = true;
        enlazar();
        precalcular();
        return;
      }
      terminarBarrido();
      cargarCapa(capas[1 - activo], id, g);
      enlazar();
      barrido = performance.now();
      uniforms.uBarrido.value = 0;
      uniforms.uConBarrido.value = 1;
    });
  };

  // Escenas (fotos)
  const cargador = new THREE.TextureLoader();
  const texturasEscena = new Map<string, Promise<THREE.Texture[]>>();
  const cargarTextura = (url: string) =>
    cargador.loadAsync(url).then((t) => {
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.anisotropy = aniso;
      return t;
    });

  let escenaActual: Escena = escenas.find((e) => e.id === inicial.escena) ?? escenas[0];
  let escenaPedida = '';

  const setEscena = (id: string) => {
    const e = escenas.find((x) => x.id === id);
    if (!e || id === escenaPedida) return;
    escenaPedida = id;
    eventos.alCargar?.(true);
    let p = texturasEscena.get(id);
    if (!p) {
      p = Promise.all([cargarTextura(e.foto), cargarTextura(e.mascara), cargarTextura(e.luz)]);
      texturasEscena.set(id, p);
    }
    p.then(([foto, mascara, luz]) => {
      if (escenaPedida !== id) return;
      escenaActual = e;
      uniforms.uFoto.value = foto;
      uniforms.uMascara.value = mascara;
      uniforms.uLuz.value = luz;
      uniforms.uTam.value.set(e.ancho, e.alto);
      uniforms.uPrincipal.value.set(e.cx, e.cy);
      uniforms.uF.value = e.f;
      uniforms.uAltura.value = e.altura;
      uniforms.uDistMax.value = e.distanciaMax;
      uniforms.uSol.value.set(...e.sol).normalize();
      const m4 = new THREE.Matrix4().makeRotationY(e.guinada).multiply(new THREE.Matrix4().makeRotationX(-e.cabeceo));
      uniforms.uRot.value.setFromMatrix4(m4);
      escenaLista = true;
      repintar();
      eventos.alCargar?.(false);
    });
  };

  setEscena(escenaActual.id);
  cambiarMolde(inicial.molde);

  // Encuadre tipo "cover" con un ligero movimiento según el puntero
  const puntero = new THREE.Vector2();
  const desplazamiento = new THREE.Vector2();
  const alMover = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  };
  canvas.addEventListener('pointermove', alMover);

  const encuadrar = () => {
    const e = escenaActual;
    const aspecto = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    const zoom = 1.05;
    let vw: number;
    let vh: number;
    if (aspecto > e.ancho / e.alto) {
      vw = e.ancho / zoom;
      vh = vw / aspecto;
    } else {
      vh = e.alto / zoom;
      vw = vh * aspecto;
    }
    const antes = desplazamiento.clone();
    desplazamiento.lerp(puntero, 0.04);
    if (antes.distanceTo(desplazamiento) > 0.0004) repintar();
    const cx = e.foco[0] * e.ancho + desplazamiento.x * vw * 0.02;
    const cy = e.foco[1] * e.alto + desplazamiento.y * vh * 0.02;
    uniforms.uVista.value.set(vw, vh);
    uniforms.uCentro.value.set(
      Math.min(e.ancho - vw / 2, Math.max(vw / 2, cx)),
      Math.min(e.alto - vh / 2, Math.max(vh / 2, cy)),
    );
  };

  let avisado = false;
  const fotograma = (t: number) => {
    if (barrido !== null) {
      const k = Math.min(1, (t - barrido) / DURACION_BARRIDO);
      const suave = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      uniforms.uBarrido.value = escenaActual.distanciaMax * suave ** 1.5;
      if (k >= 1) terminarBarrido();
    }
    encuadrar();
    if (pedirRender || barrido !== null) {
      renderer.render(escena, camara);
      pedirRender = false;
    }
    if (!avisado && sueloListo && escenaLista) {
      avisado = true;
      eventos.alListo?.();
    }
  };

  const ajustar = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w && h) {
      renderer.setSize(w, h, false);
      repintar();
    }
  };
  const ro = new ResizeObserver(ajustar);
  ro.observe(canvas);
  ajustar();

  const io = new IntersectionObserver(([entrada]) => {
    renderer.setAnimationLoop(entrada.isIntersecting ? fotograma : null);
  });
  io.observe(canvas);

  return {
    setCombinacion(molde, hexColor, hexDesmoldeante) {
      const nuevoColor = hexARgb(hexColor);
      const nuevoDesm = hexDesmoldeante ? hexARgb(hexDesmoldeante) : null;
      const cambiaTono = nuevoColor.join() !== color.join() || String(nuevoDesm) !== String(desmoldeante);
      color = nuevoColor;
      desmoldeante = nuevoDesm;
      if (cambiaTono) {
        pintar(capas[activo]);
        if (barrido !== null) pintar(capas[1 - activo]);
      }
      cambiarMolde(molde);
    },
    setEscena,
    destruir() {
      renderer.setAnimationLoop(null);
      trabajador?.terminate();
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener('pointermove', alMover);
      renderer.dispose();
    },
  };
}
