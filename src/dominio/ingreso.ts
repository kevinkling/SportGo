import { fechaISO } from '@/dominio/fechas';
import { fechaDesdeTurnoId } from '@/dominio/grilla';
import type { Reserva } from '@/tipos';

export function evaluarIngreso(
  reserva: Reserva | null,
  ahora: Date,
  espacioId?: string | null,
): { ok: true } | { codigo: string; mensaje: string } {
  if (!reserva) {
    return { codigo: 'QR_INVALIDO', mensaje: 'Ese código no corresponde a una reserva.' };
  }
  if (reserva.estado === 'cancelada') {
    return { codigo: 'RESERVA_CANCELADA', mensaje: 'Esa reserva está cancelada.' };
  }
  if (reserva.estado === 'ausente') {
    return { codigo: 'RESERVA_AUSENTE', mensaje: 'Esa reserva ya quedó marcada como ausente.' };
  }
  if (reserva.estado === 'cumplida' || reserva.ingresoEn) {
    return { codigo: 'YA_INGRESO', mensaje: 'Ya se registró el ingreso de este turno.' };
  }
  const fecha = fechaDesdeTurnoId(reserva.turnoId);
  const hoy = fechaISO(ahora);
  if (fecha && fecha !== hoy) {
    return {
      codigo: 'QR_OTRO_DIA',
      mensaje: `Ese código es para el ${fecha}, no para hoy.`,
    };
  }
  if (espacioId && reserva.espacioId !== espacioId) {
    return { codigo: 'QR_OTRA_CANCHA', mensaje: 'Ese código no es de esta cancha.' };
  }
  return { ok: true };
}
