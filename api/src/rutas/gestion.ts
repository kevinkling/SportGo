import { Hono } from 'hono';
import { z } from 'zod';

import { fechaISO, isoConZona } from '@/dominio/fechas';
import { expandirFranja, solapaFija } from '@/dominio/fijas';
import { armarGrilla, fechaDesdeTurnoId, HORAS, idTurno } from '@/dominio/grilla';
import { evaluarIngreso } from '@/dominio/ingreso';
import type { Espacio, Reserva, ReservaFija, Turno } from '@/tipos';

import {
  listarDiasBloqueados,
  listarEspacios,
  listarFijas,
  listarTurnosBloqueados,
  nuevoId,
} from '../datos.ts';
import { sql } from '../db.ts';
import { fallo, ok } from '../respuesta.ts';
import { conGestion, conSesion, type Variables } from '../sesion.ts';

export const rutasGestion = new Hono<{ Variables: Variables }>();

/** Todo lo de acá adentro pide sesión y rol de encargado o administrador. */
rutasGestion.use('*', conSesion, conGestion);

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}$/;

/**
 * Cancela las reservas que pisa un bloqueo y le deja un aviso a cada jugador.
 * La app lee esos avisos y dispara la notificación local de suspensión.
 */
async function suspenderReservas(afectadas: Reserva[], motivo: string, ahora: Date) {
  if (afectadas.length === 0) return;
  await sql`
    update reservas set estado = 'cancelada'
    where id in ${sql(afectadas.map((r) => r.id))}
  `;
  await sql`
    insert into avisos ${sql(
      afectadas.map((r) => ({
        id: nuevoId('avi'),
        usuarioId: r.usuarioId,
        reservaId: r.id,
        mensaje: `Tu turno se suspendió: ${motivo}`,
        creadoEn: isoConZona(ahora),
      })),
    )}
  `;
}

// ---------------------------------------------------------------- agenda

export interface ItemAgenda {
  espacio: Espacio;
  bloqueado: boolean;
  motivo: string | null;
  turnos: (Turno & { reserva: Reserva | null })[];
}

/** La agenda del día de los once espacios, con quién tiene cada turno. */
rutasGestion.get('/agenda', async (c) => {
  const fecha = c.req.query('fecha') ?? '';
  if (!FECHA.test(fecha)) return fallo(c, 400, 'FECHA', 'Indicá la fecha como AAAA-MM-DD.');

  const [espacios, fijas, diasBloqueados, turnosBloqueados, reservas] = await Promise.all([
    listarEspacios(),
    listarFijas(),
    listarDiasBloqueados(),
    listarTurnosBloqueados(),
    sql<Reserva[]>`
      select * from reservas where estado in ('confirmada', 'cumplida', 'ausente')
    `,
  ]);

  const items: ItemAgenda[] = espacios.map((espacio) => {
    const grilla = armarGrilla({
      espacioId: espacio.id,
      fecha,
      precio: espacio.precioPorHora,
      fijas,
      reservas: reservas.filter((r) => r.espacioId === espacio.id && r.estado === 'confirmada'),
      diasBloqueados,
      turnosBloqueados,
    });

    // Con el día bloqueado `armarGrilla` no devuelve turnos, pero el encargado
    // igual quiere ver las 16 filas con el motivo escrito en cada una.
    const base: Turno[] = grilla.bloqueado
      ? HORAS.map(({ inicio, fin }) => ({
          id: idTurno(espacio.id, fecha, inicio),
          espacioId: espacio.id,
          fecha,
          inicio,
          fin,
          estado: 'mantenimiento' as const,
          reservaId: null,
          motivoBloqueo: grilla.motivo,
          precio: espacio.precioPorHora,
        }))
      : grilla.turnos;

    return {
      espacio,
      bloqueado: grilla.bloqueado,
      motivo: grilla.motivo,
      turnos: base.map((t) => ({
        ...t,
        reserva: reservas.find((r) => r.turnoId === t.id && r.estado !== 'cancelada') ?? null,
      })),
    };
  });

  return ok(c, items);
});

// ---------------------------------------------------------------- puerta

const lectura = z.object({
  codigoQr: z.string().trim().min(1),
  /** El encargado puede fijar en qué cancha está parado, para rebotar QR de otra. */
  espacioId: z.string().nullish(),
});

rutasGestion.post('/ingreso', async (c) => {
  const cuerpo = lectura.safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) {
    return fallo(c, 400, 'QR_INVALIDO', 'Ese código no corresponde a una reserva.');
  }
  const ahora = new Date();
  const [reserva] = await sql<Reserva[]>`
    select * from reservas where "codigoQr" = ${cuerpo.data.codigoQr}
  `;

  // Mismo juez que usa la app: estado, día y cancha del código.
  const veredicto = evaluarIngreso(reserva ?? null, ahora, cuerpo.data.espacioId);
  if (!('ok' in veredicto)) {
    return fallo(c, 409, veredicto.codigo, veredicto.mensaje);
  }

  const ingresoEn = isoConZona(ahora);
  const [actualizada] = await sql<Reserva[]>`
    update reservas set estado = 'cumplida', "ingresoEn" = ${ingresoEn}
    where id = ${reserva.id}
    returning *
  `;
  const [espacio] = await sql<{ nombre: string }[]>`
    select nombre from espacios where id = ${actualizada.espacioId}
  `;
  return ok(c, { reserva: actualizada, espacioNombre: espacio?.nombre ?? actualizada.espacioId });
});

rutasGestion.post('/reservas/:id/ausente', async (c) => {
  const [reserva] = await sql<Reserva[]>`
    select * from reservas where id = ${c.req.param('id')}
  `;
  if (!reserva) return fallo(c, 404, 'NO_ENCONTRADO', 'No encontramos esa reserva.');
  if (reserva.estado !== 'confirmada') {
    return fallo(c, 409, 'ESTADO', 'Solo se marca ausente una reserva confirmada.');
  }
  const [actualizada] = await sql<Reserva[]>`
    update reservas set estado = 'ausente' where id = ${reserva.id} returning *
  `;
  await sql`update usuarios set ausencias = ausencias + 1 where id = ${reserva.usuarioId}`;
  return ok(c, actualizada);
});

// ---------------------------------------------------------------- bloqueos

export interface BloqueoVigente {
  tipo: 'dia' | 'turno';
  espacioId: string;
  fecha: string;
  /** null cuando se bloquea el día entero */
  inicio: string | null;
  motivo: string;
  creadoEn: string;
}

rutasGestion.get('/bloqueos', async (c) => {
  const bloqueos = await sql<BloqueoVigente[]>`
      select 'dia' as tipo, "espacioId", fecha, null as inicio, motivo, "creadoEn"
        from dias_bloqueados
      union all
      select 'turno' as tipo, "espacioId", fecha, inicio, motivo, "creadoEn"
        from turnos_bloqueados
      order by "creadoEn" desc
  `;
  return ok(c, bloqueos);
});

const bloqueoDia = z.object({
  espacioId: z.string().min(1),
  fecha: z.string().regex(FECHA, 'Indicá la fecha como AAAA-MM-DD.'),
  motivo: z.string().trim().min(1, 'Escribí el motivo del bloqueo.'),
});

rutasGestion.post('/bloqueos/dia', async (c) => {
  const cuerpo = bloqueoDia.safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) {
    return fallo(c, 400, 'MOTIVO', cuerpo.error.issues[0]?.message ?? 'Revisá los datos.');
  }
  const { espacioId, fecha, motivo } = cuerpo.data;
  const ahora = new Date();

  await sql`
    insert into dias_bloqueados ("espacioId", fecha, motivo, "creadoEn")
    values (${espacioId}, ${fecha}, ${motivo}, now())
    on conflict ("espacioId", fecha) do update
      set motivo = excluded.motivo, "creadoEn" = excluded."creadoEn"
  `;

  const confirmadas = await sql<Reserva[]>`
    select * from reservas where "espacioId" = ${espacioId} and estado = 'confirmada'
  `;
  await suspenderReservas(
    confirmadas.filter((r) => fechaDesdeTurnoId(r.turnoId) === fecha),
    motivo,
    ahora,
  );

  return ok(c, { espacioId, fecha, motivo });
});

rutasGestion.delete('/bloqueos/dia', async (c) => {
  const espacioId = c.req.query('espacioId') ?? '';
  const fecha = c.req.query('fecha') ?? '';
  await sql`delete from dias_bloqueados where "espacioId" = ${espacioId} and fecha = ${fecha}`;
  return ok(c, { espacioId, fecha });
});

const bloqueoTurnos = bloqueoDia.extend({
  inicios: z.array(z.string().regex(HORA)).min(1, 'Elegí al menos un turno.'),
});

rutasGestion.post('/bloqueos/turnos', async (c) => {
  const cuerpo = bloqueoTurnos.safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) {
    return fallo(c, 400, 'TURNOS', cuerpo.error.issues[0]?.message ?? 'Revisá los datos.');
  }
  const { espacioId, fecha, motivo } = cuerpo.data;
  const inicios = [...cuerpo.data.inicios].sort();
  const ahora = new Date();

  await sql`
    insert into turnos_bloqueados ${sql(
      inicios.map((inicio) => ({ espacioId, fecha, inicio, motivo })),
    )}
    on conflict ("espacioId", fecha, inicio) do update
      set motivo = excluded.motivo, "creadoEn" = now()
  `;

  const turnoIds = inicios.map((inicio) => idTurno(espacioId, fecha, inicio));
  const afectadas = await sql<Reserva[]>`
    select * from reservas where estado = 'confirmada' and "turnoId" in ${sql(turnoIds)}
  `;
  await suspenderReservas(afectadas, motivo, ahora);

  return ok(c, inicios.map((inicio) => ({ espacioId, fecha, inicio, motivo })));
});

rutasGestion.delete('/bloqueos/turno', async (c) => {
  const espacioId = c.req.query('espacioId') ?? '';
  const fecha = c.req.query('fecha') ?? '';
  const inicio = c.req.query('inicio') ?? '';
  await sql`
    delete from turnos_bloqueados
    where "espacioId" = ${espacioId} and fecha = ${fecha} and inicio = ${inicio}
  `;
  return ok(c, { espacioId, fecha, inicio });
});

// ---------------------------------------------------------------- fijas

rutasGestion.get('/fijas', async (c) => ok(c, await listarFijas()));

const franja = z.object({
  dia: z.number().int().min(0).max(6),
  inicio: z.string().regex(HORA),
  fin: z.string().regex(HORA),
});

const guardarFijas = z.object({
  espacioId: z.string().min(1),
  titular: z.string().trim().min(1, 'Indicá el titular de la fija.'),
  desde: z.string().regex(FECHA),
  hasta: z.string().regex(FECHA).nullable(),
  franjas: z.array(franja).min(1, 'Agregá al menos un horario.'),
  /** Ids de las fijas que se reemplazan al editar; vacío al crear. */
  reemplazaIds: z.array(z.string()).default([]),
});

/**
 * Crea o reemplaza las fijas de un titular. Una franja de varias horas se guarda
 * como una fija por cada hora, porque la grilla es de una hora.
 */
rutasGestion.post('/fijas', async (c) => {
  const cuerpo = guardarFijas.safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) {
    return fallo(c, 400, 'FRANJAS', cuerpo.error.issues[0]?.message ?? 'Revisá los datos.');
  }
  const { espacioId, titular, desde, hasta, franjas, reemplazaIds } = cuerpo.data;
  if (hasta !== null && hasta < desde) {
    return fallo(c, 400, 'FECHAS', 'La fecha de fin no puede ser anterior a la de inicio.');
  }

  const nuevas: ReservaFija[] = [];
  for (const f of franjas) {
    const horas = expandirFranja({ dia: f.dia as ReservaFija['dia'], inicio: f.inicio, fin: f.fin });
    if (horas.length === 0) {
      return fallo(c, 400, 'FRANJAS', 'En cada horario, "hasta" tiene que ser después de "desde".');
    }
    for (const h of horas) {
      nuevas.push({
        id: nuevoId('fij'),
        espacioId,
        titular,
        dia: f.dia as ReservaFija['dia'],
        inicio: h.inicio,
        fin: h.fin,
        desde,
        hasta,
        activa: true,
      });
    }
  }

  const claves = new Set<string>();
  for (const f of nuevas) {
    const clave = `${f.dia}-${f.inicio}`;
    if (claves.has(clave)) return fallo(c, 409, 'SOLAPE', 'Dos de los horarios se pisan entre sí.');
    claves.add(clave);
  }

  const existentes = (await listarFijas()).filter((f) => !reemplazaIds.includes(f.id));
  if (nuevas.some((f) => solapaFija(existentes, f))) {
    return fallo(c, 409, 'SOLAPE', 'Ya hay una fija en ese espacio, día y hora.');
  }

  await sql.begin(async (tx) => {
    if (reemplazaIds.length > 0) {
      await tx`delete from reservas_fijas where id in ${tx(reemplazaIds)}`;
    }
    await tx`insert into reservas_fijas ${tx(nuevas)}`;
  });

  return ok(c, nuevas);
});

rutasGestion.post('/fijas/desactivar', async (c) => {
  const cuerpo = z
    .object({ ids: z.array(z.string()).min(1) })
    .safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) return fallo(c, 400, 'DATOS', 'Indicá qué fijas desactivar.');
  await sql`update reservas_fijas set activa = false where id in ${sql(cuerpo.data.ids)}`;
  return ok(c, { ids: cuerpo.data.ids });
});

// ---------------------------------------------------------------- precio

rutasGestion.patch('/espacios/:id/precio', async (c) => {
  const cuerpo = z
    .object({ precioPorHora: z.number().int().min(0, 'El precio tiene que ser un número.') })
    .safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) {
    return fallo(c, 400, 'PRECIO', cuerpo.error.issues[0]?.message ?? 'El precio tiene que ser un número.');
  }
  const filas = await sql<{ id: string; precioPorHora: number }[]>`
    update espacios set "precioPorHora" = ${cuerpo.data.precioPorHora}
    where id = ${c.req.param('id')}
    returning id, "precioPorHora"
  `;
  if (filas.length === 0) return fallo(c, 404, 'NO_ENCONTRADO', 'Ese espacio no existe.');
  return ok(c, filas[0]);
});
