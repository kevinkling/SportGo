import type { SQLiteDatabase } from 'expo-sqlite';

import type { ResultadoGrilla as Grilla } from '@/dominio/grilla';
import { conCache, leerCache } from '@/persistencia/cache';
import { esSinRed, llamar } from '@/servicios/api';
import {
  cancelarRecordatorio,
  emitirEventoDisponibilidad,
  programarRecordatorio,
} from '@/servicios/notificaciones';
import { ok } from '@/servicios/respuesta';
import { esError, type Aviso, type Espacio, type Reserva, type Respuesta } from '@/tipos';

async function nombreDeEspacio(db: SQLiteDatabase, espacioId: string): Promise<string> {
  const lista = await leerCache<Espacio[]>(db, 'espacios');
  return lista?.find((e) => e.id === espacioId)?.nombre ?? espacioId;
}

async function guardarReserva(db: SQLiteDatabase, r: Reserva) {
  await db.runAsync(
    `INSERT OR REPLACE INTO reservas (id, turnoId, espacioId, usuarioId, cantidadPersonas, codigoQr, estado, ingresoEn, creadaEn, cancelableHasta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    r.id,
    r.turnoId,
    r.espacioId,
    r.usuarioId,
    r.cantidadPersonas,
    r.codigoQr,
    r.estado,
    r.ingresoEn,
    r.creadaEn,
    r.cancelableHasta,
  );
}

/**
 * Mis reservas. El servidor manda; cada vez que contesta, la copia del teléfono
 * se renueva entera. Sin conexión se devuelve esa copia, que es lo que permite
 * mostrar el código QR en la puerta de la cancha, donde no hay señal.
 */
export async function listarReservas(db: SQLiteDatabase, usuarioId: string): Promise<Respuesta<Reserva[]>> {
  const r = await llamar<Reserva[]>('GET', '/reservas');
  if (!esError(r)) {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM reservas WHERE usuarioId = ?', usuarioId);
      for (const reserva of r.datos) await guardarReserva(db, reserva);
    });
    return r;
  }
  if (!esSinRed(r)) return r;
  const locales = await db.getAllAsync<Reserva>(
    'SELECT * FROM reservas WHERE usuarioId = ? ORDER BY creadaEn DESC',
    usuarioId,
  );
  return locales.length > 0 ? ok(locales) : r;
}

export async function obtenerReserva(db: SQLiteDatabase, id: string): Promise<Respuesta<Reserva>> {
  const r = await llamar<Reserva>('GET', `/reservas/${id}`);
  if (!esError(r) || !esSinRed(r)) return r;
  const local = await db.getFirstAsync<Reserva>('SELECT * FROM reservas WHERE id = ?', id);
  return local ? ok(local) : r;
}

/** Avisos que la gestión dejó para mí (suspensiones por lluvia o mantenimiento). */
export async function listarAvisos(db: SQLiteDatabase, usuarioId: string): Promise<Respuesta<Aviso[]>> {
  return conCache(db, `avisos:${usuarioId}`, () => llamar<Aviso[]>('GET', '/avisos'));
}

/**
 * Si entre la última grilla guardada y la nueva un turno pasó de ocupado a libre,
 * se avisa (sólo si el espacio es favorito: lo decide `emitirEventoDisponibilidad`).
 * Varios turnos liberados juntos salen como un solo aviso del día.
 */
async function avisarLiberados(db: SQLiteDatabase, espacioId: string, fecha: string, antes: Grilla, ahora: Grilla) {
  const liberados = ahora.turnos.filter(
    (t) => t.estado === 'libre' && antes.turnos.find((p) => p.inicio === t.inicio)?.estado !== 'libre',
  );
  const seAbrioElDia = antes.bloqueado && !ahora.bloqueado;
  if (liberados.length === 0 && !seAbrioElDia) return;
  const solo = !seAbrioElDia && liberados.length === 1 ? liberados[0].inicio : null;
  await emitirEventoDisponibilidad({
    espacioId,
    espacioNombre: await nombreDeEspacio(db, espacioId),
    fecha,
    inicio: solo,
  });
}

/** La grilla de un día, ya cruzada por el servidor (reservas + fijas + bloqueos). */
export async function obtenerGrilla(db: SQLiteDatabase, espacioId: string, fecha: string): Promise<Respuesta<Grilla>> {
  const clave = `grilla:${espacioId}:${fecha}`;
  const anterior = await leerCache<Grilla>(db, clave);
  const r = await conCache(db, clave, () => llamar<Grilla>('GET', `/espacios/${espacioId}/grilla?fecha=${fecha}`));
  if (!esError(r) && anterior) await avisarLiberados(db, espacioId, fecha, anterior, r.datos);
  return r;
}

export async function crearReserva(
  db: SQLiteDatabase,
  entrada: { espacioId: string; fecha: string; inicio: string; cantidadPersonas: number },
): Promise<Respuesta<Reserva>> {
  const r = await llamar<Reserva>('POST', '/reservas', entrada);
  if (esError(r)) return r;
  await guardarReserva(db, r.datos);
  await programarRecordatorio({
    reservaId: r.datos.id,
    espacioNombre: await nombreDeEspacio(db, entrada.espacioId),
    fecha: entrada.fecha,
    inicio: entrada.inicio,
  });
  return r;
}

export async function cancelarReserva(db: SQLiteDatabase, id: string): Promise<Respuesta<Reserva>> {
  const r = await llamar<Reserva>('POST', `/reservas/${id}/cancelar`);
  if (esError(r)) return r;
  await guardarReserva(db, r.datos);
  await cancelarRecordatorio(id);
  return r;
}
