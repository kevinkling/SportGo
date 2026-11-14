import { instanteTurno } from '@/dominio/fechas';

const DOS_HORAS_MS = 2 * 60 * 60 * 1000;

/** Instantánea del recordatorio (turno − 2 h). Null si esa hora ya pasó. */
export function calcularMomentoRecordatorio(fecha: string, inicio: string, ahora = new Date()): Date | null {
  const momento = new Date(instanteTurno(fecha, inicio).getTime() - DOS_HORAS_MS);
  if (momento.getTime() <= ahora.getTime()) return null;
  return momento;
}
