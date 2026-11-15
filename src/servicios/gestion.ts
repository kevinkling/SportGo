import type { SQLiteDatabase } from 'expo-sqlite';

import type { FranjaFija } from '@/dominio/fijas';
import { olvidarEspacios } from '@/servicios/espacios';
import { llamar } from '@/servicios/api';
import { esError, type DiaBloqueado, type Espacio, type Reserva, type ReservaFija, type Respuesta, type Rol, type Turno, type TurnoBloqueado } from '@/tipos';

/**
 * Todo lo del encargado y el administrador. Cada función es un pedido a /gestion
 * en la API; el servidor comprueba el rol con el token, así que el parámetro
 * `rol` que reciben algunas ya no decide nada (queda por las pantallas, que lo
 * usan para mostrar u ocultar botones).
 */

export interface ItemAgenda {
  espacio: Espacio;
  bloqueado: boolean;
  motivo: string | null;
  turnos: (Turno & { reserva: Reserva | null })[];
}

export interface ResultadoIngreso {
  reserva: Reserva;
  espacioNombre: string;
}

export interface BloqueoVigente {
  tipo: 'dia' | 'turno';
  espacioId: string;
  fecha: string;
  /** null cuando se bloquea el día entero */
  inicio: string | null;
  motivo: string;
  creadoEn: string;
}

export interface EntradaFijas {
  espacioId: string;
  titular: string;
  desde: string;
  /** null = sin fecha de fin */
  hasta: string | null;
  franjas: FranjaFija[];
  /** Ids de las fijas que se reemplazan al editar (vacío al crear). */
  reemplazaIds: string[];
}

export function agendaDelDia(_db: SQLiteDatabase, fecha: string): Promise<Respuesta<ItemAgenda[]>> {
  return llamar('GET', `/gestion/agenda?fecha=${fecha}`);
}

/** El encargado escanea el QR en la puerta. `espacioId` rebota códigos de otra cancha. */
export function validarIngreso(
  _db: SQLiteDatabase,
  codigoQr: string,
  _rol: Rol,
  espacioId?: string | null,
): Promise<Respuesta<ResultadoIngreso>> {
  return llamar('POST', '/gestion/ingreso', { codigoQr, espacioId });
}

export function marcarAusente(_db: SQLiteDatabase, reservaId: string, _rol: Rol): Promise<Respuesta<Reserva>> {
  return llamar('POST', `/gestion/reservas/${reservaId}/ausente`);
}

export function listarBloqueos(_db: SQLiteDatabase): Promise<Respuesta<BloqueoVigente[]>> {
  return llamar('GET', '/gestion/bloqueos');
}

export function bloquearDia(
  _db: SQLiteDatabase,
  entrada: { espacioId: string; fecha: string; motivo: string; rol: Rol },
): Promise<Respuesta<DiaBloqueado>> {
  const { espacioId, fecha, motivo } = entrada;
  return llamar('POST', '/gestion/bloqueos/dia', { espacioId, fecha, motivo });
}

export function desbloquearDia(
  _db: SQLiteDatabase,
  espacioId: string,
  fecha: string,
  _rol: Rol,
): Promise<Respuesta<{ espacioId: string; fecha: string }>> {
  return llamar('DELETE', `/gestion/bloqueos/dia?espacioId=${espacioId}&fecha=${fecha}`);
}

/** Bloquea uno o varios turnos de un día; el servidor avisa una vez a cada jugador afectado. */
export function bloquearTurnos(
  _db: SQLiteDatabase,
  entrada: { espacioId: string; fecha: string; inicios: string[]; motivo: string; rol: Rol },
): Promise<Respuesta<TurnoBloqueado[]>> {
  const { espacioId, fecha, inicios, motivo } = entrada;
  return llamar('POST', '/gestion/bloqueos/turnos', { espacioId, fecha, inicios, motivo });
}

export function desbloquearTurno(
  _db: SQLiteDatabase,
  espacioId: string,
  fecha: string,
  inicio: string,
  _rol: Rol,
): Promise<Respuesta<{ espacioId: string; fecha: string; inicio: string }>> {
  return llamar('DELETE', `/gestion/bloqueos/turno?espacioId=${espacioId}&fecha=${fecha}&inicio=${inicio}`);
}

export function listarFijasServicio(_db: SQLiteDatabase): Promise<Respuesta<ReservaFija[]>> {
  return llamar('GET', '/gestion/fijas');
}

/** Crea (o reemplaza al editar) las fijas de un titular: el servidor las parte en una por hora. */
export function guardarFijas(_db: SQLiteDatabase, entrada: EntradaFijas, _rol: Rol): Promise<Respuesta<ReservaFija[]>> {
  return llamar('POST', '/gestion/fijas', entrada);
}

export function desactivarFijas(_db: SQLiteDatabase, ids: string[], _rol: Rol): Promise<Respuesta<{ ids: string[] }>> {
  return llamar('POST', '/gestion/fijas/desactivar', { ids });
}

export async function cambiarPrecio(
  db: SQLiteDatabase,
  espacioId: string,
  precio: number,
  _rol: Rol,
): Promise<Respuesta<{ espacioId: string; precio: number }>> {
  const r = await llamar<{ id: string; precioPorHora: number }>('PATCH', `/gestion/espacios/${espacioId}/precio`, {
    precioPorHora: Math.round(precio),
  });
  if (esError(r)) return r;
  // La lista de espacios guardada en el teléfono tiene el precio viejo.
  await olvidarEspacios(db);
  return { datos: { espacioId: r.datos.id, precio: r.datos.precioPorHora }, meta: r.meta };
}
