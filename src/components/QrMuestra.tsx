import { View } from 'react-native';

interface QrMuestraProps {
  codigo: string;
  size?: number;
}

export function QrMuestra({ codigo, size = 180 }: QrMuestraProps) {
  const n = 21;
  const celda = size / n;
  let h = 0;
  for (const ch of codigo) h = (h * 33 + ch.charCodeAt(0)) >>> 0;

  const celdas: { x: number; y: number }[] = [];
  const finder = (r: number, c: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const borde = y === 0 || x === 0 || y === 6 || x === 6;
        const nucleo = y >= 2 && y <= 4 && x >= 2 && x <= 4;
        if (borde || nucleo) celdas.push({ x: c + x, y: r + y });
      }
    }
  };
  finder(0, 0);
  finder(0, 14);
  finder(14, 0);

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const enBuscador = (y < 8 && x < 8) || (y < 8 && x > 12) || (y > 12 && x < 8);
      if (enBuscador) continue;
      h = (h * 1664525 + 1013904223) >>> 0;
      if ((h >>> 28) & 1) celdas.push({ x, y });
    }
  }

  return (
    <View
      accessible
      accessibilityLabel={`Código QR de la reserva ${codigo}`}
      style={{ width: size, height: size, backgroundColor: '#fff' }}>
      {celdas.map((c, i) => (
        <View
          key={`${c.x}-${c.y}-${i}`}
          style={{
            position: 'absolute',
            left: c.x * celda,
            top: c.y * celda,
            width: celda,
            height: celda,
            backgroundColor: '#14120e',
          }}
        />
      ))}
    </View>
  );
}
