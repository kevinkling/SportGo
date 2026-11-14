import type { SQLiteDatabase } from 'expo-sqlite';

import type { Aviso, DiaBloqueado, ReservaFija, TurnoBloqueado } from '@/tipos';

interface FilaFija {
  id: string;
  espacioId: string;
  titular: string;
  dia: number;
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
  activa: number;
}

export function filaAFija(f: FilaFija): ReservaFija {
  return {
    id: f.id,
    espacioId: f.espacioId,
    titular: f.titular,
    dia: f.dia as ReservaFija['dia'],
    inicio: f.inicio,
    fin: f.fin,
    desde: f.desde,
    hasta: f.hasta,
    activa: f.activa === 1,
  };
}

export async function leerFijas(db: SQLiteDatabase): Promise<ReservaFija[]> {
  const filas = await db.getAllAsync<FilaFija>('SELECT * FROM reservas_fijas ORDER BY dia, inicio');
  return filas.map(filaAFija);
}

export async function leerDiasBloqueados(db: SQLiteDatabase): Promise<DiaBloqueado[]> {
  return db.getAllAsync<DiaBloqueado>('SELECT espacioId, fecha, motivo FROM dias_bloqueados');
}

export async function leerTurnosBloqueados(db: SQLiteDatabase): Promise<TurnoBloqueado[]> {
  return db.getAllAsync<TurnoBloqueado>('SELECT espacioId, fecha, inicio, motivo FROM turnos_bloqueados');
}

export async function leerPrecios(db: SQLiteDatabase): Promise<Record<string, number>> {
  const filas = await db.getAllAsync<{ espacioId: string; precio: number }>('SELECT espacioId, precio FROM precios_espacio');
  return Object.fromEntries(filas.map((f) => [f.espacioId, f.precio]));
}

export async function insertarAviso(db: SQLiteDatabase, aviso: Aviso) {
  await db.runAsync(
    'INSERT INTO avisos (id, usuarioId, reservaId, mensaje, creadoEn) VALUES (?, ?, ?, ?, ?)',
    aviso.id,
    aviso.usuarioId,
    aviso.reservaId,
    aviso.mensaje,
    aviso.creadoEn,
  );
}
