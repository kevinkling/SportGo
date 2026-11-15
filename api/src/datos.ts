import { randomUUID } from 'node:crypto';

import type { DiaBloqueado, Espacio, Reserva, ReservaFija, TurnoBloqueado } from '@/tipos';

import { sql } from './db.ts';

/** Ids cortos y legibles, en el formato de cadena que fija el PRD ("res-…", "usr-…"). */
export function nuevoId(prefijo: string): string {
  return `${prefijo}-${randomUUID().replaceAll('-', '').slice(0, 10)}`;
}

/**
 * `latitud` y `longitud` son dos columnas en la base, pero el PRD las quiere
 * juntas en `coordenadas`. El armado va acá, en una sola consulta, para que
 * ninguna ruta tenga que acordarse.
 */
const COLUMNAS_ESPACIO = sql`
  id, nombre, "deporteId", complejo, superficie, techado, iluminacion,
  capacidad, "precioPorHora",
  json_build_object('latitud', latitud, 'longitud', longitud) as coordenadas,
  imagenes, "videoUrl", reglas, activo
`;

export async function listarEspacios(soloActivos = true): Promise<Espacio[]> {
  return sql<Espacio[]>`
    select ${COLUMNAS_ESPACIO} from espacios
    where ${soloActivos ? sql`activo = true` : sql`true`}
    order by id
  `;
}

export async function buscarEspacio(id: string): Promise<Espacio | null> {
  const filas = await sql<Espacio[]>`
    select ${COLUMNAS_ESPACIO} from espacios where id = ${id}
  `;
  return filas[0] ?? null;
}

export async function listarFijas(): Promise<ReservaFija[]> {
  return sql<ReservaFija[]>`
    select id, "espacioId", titular, dia, inicio, fin, desde, hasta, activa
    from reservas_fijas
    order by dia, inicio
  `;
}

export async function listarDiasBloqueados(): Promise<DiaBloqueado[]> {
  return sql<DiaBloqueado[]>`
    select "espacioId", fecha, motivo from dias_bloqueados
  `;
}

export async function listarTurnosBloqueados(): Promise<TurnoBloqueado[]> {
  return sql<TurnoBloqueado[]>`
    select "espacioId", fecha, inicio, motivo from turnos_bloqueados
  `;
}

/** Reservas que ocupan la grilla: solo las confirmadas tapan un turno. */
export async function reservasConfirmadas(espacioId?: string): Promise<Reserva[]> {
  return sql<Reserva[]>`
    select * from reservas
    where estado = 'confirmada'
      and ${espacioId ? sql`"espacioId" = ${espacioId}` : sql`true`}
  `;
}
