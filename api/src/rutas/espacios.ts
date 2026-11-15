import { Hono } from 'hono';

import { armarGrilla } from '@/dominio/grilla';
import type { Deporte } from '@/tipos';

import {
  buscarEspacio,
  listarDiasBloqueados,
  listarEspacios,
  listarFijas,
  listarTurnosBloqueados,
  reservasConfirmadas,
} from '../datos.ts';
import { sql } from '../db.ts';
import { fallo, ok } from '../respuesta.ts';

export const rutasEspacios = new Hono();

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Todo lo de este archivo es público a propósito: el PRD dice que mirar la
 * disponibilidad no pide cuenta. La cuenta hace falta recién para reservar.
 */

rutasEspacios.get('/deportes', async (c) => {
  const deportes = await sql<Deporte[]>`select id, nombre, icono, color from deportes order by id`;
  return ok(c, deportes);
});

rutasEspacios.get('/espacios', async (c) => {
  const deporteId = c.req.query('deporteId');
  const complejo = c.req.query('complejo');
  const espacios = await listarEspacios();
  const filtrados = espacios.filter(
    (e) => (!deporteId || e.deporteId === deporteId) && (!complejo || e.complejo === complejo),
  );
  return ok(c, filtrados, { total: filtrados.length });
});

rutasEspacios.get('/espacios/:id', async (c) => {
  const espacio = await buscarEspacio(c.req.param('id'));
  if (!espacio) return fallo(c, 404, 'NO_ENCONTRADO', 'Ese espacio no existe.');
  return ok(c, espacio);
});

/**
 * La pantalla más importante: la grilla de un día.
 *
 * El cruce entre turnos reservados, fijas vigentes y bloqueos de mantenimiento
 * lo resuelve `armarGrilla`, que es el mismo archivo que usa la app
 * (api/tsconfig.json apunta `@/dominio/*` a ../src/dominio). Una sola copia de
 * la regla: si cambia, cambia en los dos lados.
 */
rutasEspacios.get('/espacios/:id/grilla', async (c) => {
  const espacioId = c.req.param('id');
  const fecha = c.req.query('fecha') ?? '';
  if (!FECHA.test(fecha)) {
    return fallo(c, 400, 'FECHA', 'Indicá la fecha como AAAA-MM-DD.');
  }

  const espacio = await buscarEspacio(espacioId);
  if (!espacio) return fallo(c, 404, 'NO_ENCONTRADO', 'Ese espacio no existe.');

  const [fijas, reservas, diasBloqueados, turnosBloqueados] = await Promise.all([
    listarFijas(),
    reservasConfirmadas(espacioId),
    listarDiasBloqueados(),
    listarTurnosBloqueados(),
  ]);

  return ok(
    c,
    armarGrilla({
      espacioId,
      fecha,
      precio: espacio.precioPorHora,
      fijas,
      reservas,
      diasBloqueados,
      turnosBloqueados,
    }),
  );
});
