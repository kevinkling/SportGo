import { useMemo } from 'react';
import { View } from 'react-native';

import { matrizQr } from '@/dominio/qr';

interface QrMuestraProps {
  codigo: string;
  size?: number;
}

/** Margen blanco alrededor, en módulos. El estándar pide 4: sin él muchos lectores no encuentran el código. */
const MARGEN = 4;

export function QrMuestra({ codigo, size = 180 }: QrMuestraProps) {
  const matriz = useMemo(() => matrizQr(codigo), [codigo]);
  const total = matriz.length + 2 * MARGEN;
  // Módulos de un número entero de píxeles: con medidas fraccionarias quedan
  // líneas finas entre cuadros que confunden al lector.
  const celda = Math.max(1, Math.floor(size / total));
  const lado = celda * total;

  // Cada fila se dibuja como tramos de módulos oscuros seguidos, no uno por uno:
  // un QR de 25×25 baja de ~300 vistas a unas 100.
  const tramos = useMemo(() => {
    const salida: { fila: number; desde: number; largo: number }[] = [];
    matriz.forEach((fila, y) => {
      let x = 0;
      while (x < fila.length) {
        if (!fila[x]) {
          x++;
          continue;
        }
        const desde = x;
        while (x < fila.length && fila[x]) x++;
        salida.push({ fila: y, desde, largo: x - desde });
      }
    });
    return salida;
  }, [matriz]);

  return (
    <View
      accessible
      accessibilityLabel={`Código QR de la reserva ${codigo}`}
      style={{ width: lado, height: lado, backgroundColor: '#fff' }}>
      {tramos.map((t) => (
        <View
          key={`${t.fila}-${t.desde}`}
          style={{
            position: 'absolute',
            left: (t.desde + MARGEN) * celda,
            top: (t.fila + MARGEN) * celda,
            width: t.largo * celda,
            height: celda,
            backgroundColor: '#000',
          }}
        />
      ))}
    </View>
  );
}
