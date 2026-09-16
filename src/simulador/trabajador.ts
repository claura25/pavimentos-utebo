// Genera las texturas de los moldes fuera del hilo principal para no congelar la animación.
import { moldes } from './catalogo';
import { generar } from './texturas';

self.onmessage = (e: MessageEvent<{ id: string; res: number }>) => {
  const { id, res } = e.data;
  const molde = moldes.find((m) => m.id === id);
  if (!molde) return;
  const g = generar(molde.def, res);
  (self as unknown as Worker).postMessage({ id, g }, [g.lum.buffer, g.mascara.buffer, g.normal.buffer]);
};
