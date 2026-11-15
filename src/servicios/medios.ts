import type { SQLiteDatabase } from 'expo-sqlite';

import { leerCache } from '@/persistencia/cache';
import type { Espacio } from '@/tipos';

/**
 * Las pantallas piden la foto o el video de un espacio y no les importa de dónde
 * sale: si ya se bajó al teléfono se devuelve la ruta local (se ve sin datos);
 * si todavía no, la URL de Supabase Storage que vino con el espacio.
 */

async function espaciosEnCache(db: SQLiteDatabase): Promise<Espacio[]> {
  return (await leerCache<Espacio[]>(db, 'espacios')) ?? [];
}

export async function portadasDeEspacios(db: SQLiteDatabase): Promise<Record<string, string>> {
  const locales = await db.getAllAsync<{ espacioId: string; ruta: string }>(
    'SELECT espacioId, ruta FROM fotos_espacio WHERE orden = 0',
  );
  const portadas: Record<string, string> = {};
  for (const e of await espaciosEnCache(db)) {
    if (e.imagenes[0]) portadas[e.id] = e.imagenes[0];
  }
  for (const fila of locales) portadas[fila.espacioId] = fila.ruta;
  return portadas;
}

export async function fotosDeEspacio(db: SQLiteDatabase, espacioId: string): Promise<string[]> {
  const remotas = (await espaciosEnCache(db)).find((e) => e.id === espacioId)?.imagenes ?? [];
  const locales = await db.getAllAsync<{ orden: number; ruta: string }>(
    'SELECT orden, ruta FROM fotos_espacio WHERE espacioId = ? ORDER BY orden ASC',
    espacioId,
  );
  // Una por una: si se bajaron 3 de 4, las 3 salen locales y la 4ª remota.
  return remotas.map((url, i) => locales.find((l) => l.orden === i)?.ruta ?? url);
}

export async function videoDeEspacio(db: SQLiteDatabase, espacioId: string): Promise<string | null> {
  const local = await db.getFirstAsync<{ ruta: string }>(
    'SELECT ruta FROM videos_espacio WHERE espacioId = ?',
    espacioId,
  );
  if (local) return local.ruta;
  return (await espaciosEnCache(db)).find((e) => e.id === espacioId)?.videoUrl ?? null;
}
