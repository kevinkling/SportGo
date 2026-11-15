import jsQR from 'jsqr';

import { matrizQr } from '@/dominio/qr';

/** Pinta la matriz como lo hace QrMuestra (margen de 4 módulos, celdas enteras) y devuelve los píxeles. */
function pintar(codigo: string, celda: number) {
  const matriz = matrizQr(codigo);
  const margen = 4;
  const lado = (matriz.length + 2 * margen) * celda;
  const pixeles = new Uint8ClampedArray(lado * lado * 4).fill(255);
  matriz.forEach((fila, y) =>
    fila.forEach((oscuro, x) => {
      if (!oscuro) return;
      for (let dy = 0; dy < celda; dy++) {
        for (let dx = 0; dx < celda; dx++) {
          const i = (((y + margen) * celda + dy) * lado + (x + margen) * celda + dx) * 4;
          pixeles[i] = pixeles[i + 1] = pixeles[i + 2] = 0;
        }
      }
    }),
  );
  return { pixeles, lado };
}

describe('matrizQr', () => {
  it.each(['VGY-DEMO-PUERTA', 'VGY-A0FC46-1120-19', 'VGY-1180-0219-19'])('un lector decodifica %s', (codigo) => {
    const { pixeles, lado } = pintar(codigo, 6);
    expect(jsQR(pixeles, lado, lado)?.data).toBe(codigo);
  });

  it('es cuadrada y tiene los tres cuadros buscadores', () => {
    const m = matrizQr('VGY-DEMO-PUERTA');
    const n = m.length;
    expect(m.every((f) => f.length === n)).toBe(true);
    // Esquinas superior izquierda, superior derecha e inferior izquierda: módulo oscuro.
    expect(m[0][0] && m[0][n - 1] && m[n - 1][0]).toBe(true);
  });
});
