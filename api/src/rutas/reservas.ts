import { Hono } from 'hono';
import { z } from 'zod';

import { isoConZona } from '@/dominio/fechas';
import {
  armarGrilla,
  cancelableHastaIso,
  esCancelacionTardia,
  idTurno,
  puedeSumarReserva,
  turnoReservable,
} from '@/dominio/grilla';
import type { Aviso, Reserva } from '@/tipos';

import {
  buscarEspacio,
  listarDiasBloqueados,
  listarFijas,
  listarTurnosBloqueados,
  nuevoId,
  reservasConfirmadas,
} from '../datos.ts';
import { sql } from '../db.ts';
import { fallo, ok } from '../respuesta.ts';
import { conSesion, type Variables } from '../sesion.ts';

export const rutasReservas = new Hono<{ Variables: Variables }>();

rutasReservas.use('*', conSesion);

const nuevaReserva = z.object({
  espacioId: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Indicá la fecha como AAAA-MM-DD.'),
  inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Indicá la hora como HH:MM.'),
  cantidadPersonas: z.number().int().positive(),
});

function codigoQr(reservaId: string, fecha: string, inicio: string): string {
  const sufijo = reservaId.slice(-6).toUpperCase();
  return `VGY-${sufijo}-${fecha.slice(5).replace('-', '')}-${inicio.slice(0, 2)}`;
}

function esTurnoTomado(error: unknown): boolean {
  // 23505 = unique_violation. Acá solo la puede tirar el índice
  // reservas_turno_confirmado: alguien reservó ese turno un instante antes.
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505';
}

rutasReservas.get('/reservas', async (c) => {
  const reservas = await sql<Reserva[]>`
    select * from reservas where "usuarioId" = ${c.get('usuario').id}
    order by "creadaEn" desc
  `;
  return ok(c, reservas);
});

rutasReservas.get('/reservas/:id', async (c) => {
  const [reserva] = await sql<Reserva[]>`
    select * from reservas where id = ${c.req.param('id')} and "usuarioId" = ${c.get('usuario').id}
  `;
  if (!reserva) return fallo(c, 404, 'NO_ENCONTRADO', 'No encontramos esa reserva.');
  return ok(c, reserva);
});

rutasReservas.post('/reservas', async (c) => {
  const cuerpo = nuevaReserva.safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) {
    return fallo(c, 400, 'DATOS', cuerpo.error.issues[0]?.message ?? 'Revisá los datos.');
  }
  const { espacioId, fecha, inicio, cantidadPersonas } = cuerpo.data;
  const usuario = c.get('usuario');
  const ahora = new Date();

  const espacio = await buscarEspacio(espacioId);
  if (!espacio || !espacio.activo) {
    return fallo(c, 404, 'NO_ENCONTRADO', 'Ese espacio no existe.');
  }
  if (cantidadPersonas < 2 || cantidadPersonas > espacio.capacidad) {
    return fallo(c, 400, 'CUPOS', `Van entre 2 y ${espacio.capacidad} personas.`);
  }

  const [{ activas }] = await sql<{ activas: number }[]>`
    select count(*)::int as activas from reservas
    where "usuarioId" = ${usuario.id} and estado = 'confirmada'
  `;
  if (!puedeSumarReserva(activas)) {
    return fallo(c, 409, 'TOPE', 'Ya tenés tres reservas activas.');
  }

  const [fijas, reservas, diasBloqueados, turnosBloqueados] = await Promise.all([
    listarFijas(),
    reservasConfirmadas(espacioId),
    listarDiasBloqueados(),
    listarTurnosBloqueados(),
  ]);
  const grilla = armarGrilla({
    espacioId,
    fecha,
    precio: espacio.precioPorHora,
    fijas,
    reservas,
    diasBloqueados,
    turnosBloqueados,
  });
  if (grilla.bloqueado) {
    return fallo(c, 409, 'DIA_BLOQUEADO', grilla.motivo ?? 'Ese día está suspendido.');
  }
  const turno = grilla.turnos.find((t) => t.inicio === inicio);
  if (!turno || !turnoReservable(turno, ahora)) {
    return fallo(c, 409, 'TURNO_OCUPADO', 'Ese turno ya fue reservado.');
  }

  const id = nuevoId('res');
  const reserva: Reserva = {
    id,
    turnoId: idTurno(espacioId, fecha, inicio),
    espacioId,
    usuarioId: usuario.id,
    cantidadPersonas,
    codigoQr: codigoQr(id, fecha, inicio),
    estado: 'confirmada',
    ingresoEn: null,
    creadaEn: isoConZona(ahora),
    cancelableHasta: cancelableHastaIso(fecha, inicio),
  };

  try {
    const [guardada] = await sql<Reserva[]>`
      insert into reservas ${sql(reserva)} returning *
    `;
    return ok(c, guardada);
  } catch (error) {
    if (esTurnoTomado(error)) {
      return fallo(c, 409, 'TURNO_OCUPADO', 'Ese turno ya fue reservado.');
    }
    throw error;
  }
});

rutasReservas.post('/reservas/:id/cancelar', async (c) => {
  const usuario = c.get('usuario');
  const [reserva] = await sql<Reserva[]>`
    select * from reservas where id = ${c.req.param('id')} and "usuarioId" = ${usuario.id}
  `;
  if (!reserva) return fallo(c, 404, 'NO_ENCONTRADO', 'No encontramos esa reserva.');
  if (reserva.estado !== 'confirmada') {
    return fallo(c, 409, 'ESTADO', 'Esa reserva ya no se puede cancelar.');
  }
  if (esCancelacionTardia(reserva.cancelableHasta, new Date())) {
    return fallo(
      c,
      409,
      'CANCELACION_TARDIA',
      'Faltan menos de 4 horas: ya no se puede cancelar desde la app. Avisá a la Dirección de Deportes.',
    );
  }
  const [cancelada] = await sql<Reserva[]>`
    update reservas set estado = 'cancelada' where id = ${reserva.id} returning *
  `;
  return ok(c, cancelada);
});

/** Avisos de suspensión que dejó la gestión para este jugador. */
rutasReservas.get('/avisos', async (c) => {
  const avisos = await sql<Aviso[]>`
    select id, "usuarioId", "reservaId", mensaje, "creadoEn" from avisos
    where "usuarioId" = ${c.get('usuario').id}
    order by "creadoEn" desc
  `;
  return ok(c, avisos);
});
