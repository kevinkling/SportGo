import type { SQLiteDatabase } from 'expo-sqlite';

import { cancelableHastaIso, armarGrilla, fechaDesdeTurnoId, horaDesdeTurnoId, puedeSumarReserva, turnoReservable } from '@/dominio/grilla';
import { isoConZona } from '@/dominio/fechas';
import { espacios } from '@/mocks/catalogo';
import { leerDiasBloqueados, leerFijas, leerPrecios, leerTurnosBloqueados } from '@/persistencia/gestion';
import { cancelarRecordatorio, emitirEventoDisponibilidad, programarRecordatorio } from '@/servicios/notificaciones';
import { esperar, fallo, ok } from '@/servicios/respuesta';
import type { Aviso, Reserva, Respuesta } from '@/tipos';
import type { ResultadoGrilla as Grilla } from '@/dominio/grilla';

export async function listarReservas(db: SQLiteDatabase, usuarioId: string): Promise<Respuesta<Reserva[]>> {
  await esperar();
  const filas = await db.getAllAsync<Reserva>(
    'SELECT * FROM reservas WHERE usuarioId = ? ORDER BY creadaEn DESC',
    usuarioId,
  );
  return ok(filas);
}

export async function listarAvisos(db: SQLiteDatabase, usuarioId: string): Promise<Respuesta<Aviso[]>> {
  await esperar();
  const filas = await db.getAllAsync<Aviso>(
    'SELECT * FROM avisos WHERE usuarioId = ? ORDER BY creadoEn DESC',
    usuarioId,
  );
  return ok(filas);
}

export async function obtenerReserva(db: SQLiteDatabase, id: string): Promise<Respuesta<Reserva>> {
  await esperar();
  const fila = await db.getFirstAsync<Reserva>('SELECT * FROM reservas WHERE id = ?', id);
  if (!fila) return fallo('NO_ENCONTRADO', 'No encontramos esa reserva.');
  return ok(fila);
}

export async function obtenerGrilla(
  db: SQLiteDatabase,
  espacioId: string,
  fecha: string,
  ahora = new Date(),
): Promise<Respuesta<Grilla>> {
  await esperar();
  const espacio = espacios.find((e) => e.id === espacioId);
  if (!espacio) return fallo('NO_ENCONTRADO', 'Ese espacio no existe.');

  const [reservas, fijas, diasBloqueados, turnosBloqueados, precios] = await Promise.all([
    db.getAllAsync<Reserva>("SELECT * FROM reservas WHERE espacioId = ? AND estado = 'confirmada'", espacioId),
    leerFijas(db),
    leerDiasBloqueados(db),
    leerTurnosBloqueados(db),
    leerPrecios(db),
  ]);

  const resultado = armarGrilla({
    espacioId,
    fecha,
    precio: precios[espacioId] ?? espacio.precioPorHora,
    fijas,
    reservas,
    diasBloqueados,
    turnosBloqueados,
  });

  return ok(resultado);
}

export async function crearReserva(
  db: SQLiteDatabase,
  entrada: { usuarioId: string; espacioId: string; fecha: string; inicio: string; cantidadPersonas: number },
  ahora = new Date(),
): Promise<Respuesta<Reserva>> {
  await esperar();
  const espacio = espacios.find((e) => e.id === entrada.espacioId);
  if (!espacio) return fallo('NO_ENCONTRADO', 'Ese espacio no existe.');
  if (entrada.cantidadPersonas < 2 || entrada.cantidadPersonas > espacio.capacidad) {
    return fallo('CUPOS', `Van entre 2 y ${espacio.capacidad} personas.`);
  }

  const activas = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM reservas WHERE usuarioId = ? AND estado = 'confirmada'",
    entrada.usuarioId,
  );
  if (!puedeSumarReserva(activas?.c ?? 0)) {
    return fallo('TOPE', 'Ya tenés tres reservas activas.');
  }

  const grilla = await obtenerGrilla(db, entrada.espacioId, entrada.fecha, ahora);
  if ('error' in grilla) return grilla;
  const datos = grilla.datos as Grilla;
  if (datos.bloqueado) {
    return fallo('DIA_BLOQUEADO', datos.motivo ?? 'Ese día está suspendido.');
  }
  const turno = datos.turnos.find((t) => t.inicio === entrada.inicio);
  if (!turno || !turnoReservable(turno, ahora)) {
    return fallo('TURNO_OCUPADO', 'Ese turno ya fue reservado.');
  }

  const id = `res-${Date.now()}`;
  const codigoQr = `VGY-${id.slice(-4)}-${entrada.fecha.slice(8)}${entrada.inicio.slice(0, 2)}`;
  const reserva: Reserva = {
    id,
    turnoId: turno.id,
    espacioId: entrada.espacioId,
    usuarioId: entrada.usuarioId,
    cantidadPersonas: entrada.cantidadPersonas,
    codigoQr,
    estado: 'confirmada',
    ingresoEn: null,
    creadaEn: isoConZona(ahora),
    cancelableHasta: cancelableHastaIso(entrada.fecha, entrada.inicio),
  };

  await db.runAsync(
    `INSERT INTO reservas (id, turnoId, espacioId, usuarioId, cantidadPersonas, codigoQr, estado, ingresoEn, creadaEn, cancelableHasta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    reserva.id,
    reserva.turnoId,
    reserva.espacioId,
    reserva.usuarioId,
    reserva.cantidadPersonas,
    reserva.codigoQr,
    reserva.estado,
    reserva.ingresoEn,
    reserva.creadaEn,
    reserva.cancelableHasta,
  );

  await programarRecordatorio({
    reservaId: reserva.id,
    espacioNombre: espacio.nombre,
    fecha: entrada.fecha,
    inicio: entrada.inicio,
  });

  return ok(reserva);
}

export async function cancelarReserva(
  db: SQLiteDatabase,
  id: string,
  ahora = new Date(),
): Promise<Respuesta<Reserva>> {
  await esperar();
  const fila = await db.getFirstAsync<Reserva>('SELECT * FROM reservas WHERE id = ?', id);
  if (!fila) return fallo('NO_ENCONTRADO', 'No encontramos esa reserva.');
  if (fila.estado !== 'confirmada') {
    return fallo('ESTADO', 'Esa reserva ya no se puede cancelar.');
  }
  await db.runAsync("UPDATE reservas SET estado = 'cancelada' WHERE id = ?", id);
  await cancelarRecordatorio(id);
  const fecha = fechaDesdeTurnoId(fila.turnoId);
  const inicio = horaDesdeTurnoId(fila.turnoId);
  if (fecha && inicio) {
    await emitirEventoDisponibilidad({ espacioId: fila.espacioId, fecha, inicio });
  }
  return ok({ ...fila, estado: 'cancelada' });
}
