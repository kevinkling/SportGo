import qrcode from 'qrcode-generator';

/**
 * Matriz de un código QR real para `codigo`: `true` = módulo oscuro.
 *
 * Corrección de errores "M" (recupera hasta ~15 % dañado): el QR se lee desde otra
 * pantalla, a la intemperie y de noche, así que conviene que aguante reflejos.
 * La versión (el tamaño) la elige la librería según el largo del texto.
 */
export function matrizQr(codigo: string): boolean[][] {
  const qr = qrcode(0, 'M');
  qr.addData(codigo);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, fila) => Array.from({ length: n }, (_, col) => qr.isDark(fila, col)));
}
