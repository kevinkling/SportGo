import type { SQLiteDatabase } from 'expo-sqlite';

import { esSinRed } from '@/servicios/api';
import { ok } from '@/servicios/respuesta';
import { esError, type Respuesta } from '@/tipos';

/**
 * Copia local de lo último que contestó la API, para que la app abra y muestre
 * algo sin conexión. Una fila por pedido: la clave dice cuál ("espacios",
 * "grilla:esp-02:2026-11-17"…) y `json` guarda el arreglo u objeto tal cual vino.
 */

export async function guardarCache<T>(db: SQLiteDatabase, clave: string, datos: T) {
  await db.runAsync(
    'INSERT OR REPLACE INTO cache (clave, json, guardadoEn) VALUES (?, ?, ?)',
    clave,
    JSON.stringify(datos),
    new Date().toISOString(),
  );
}

export async function leerCache<T>(db: SQLiteDatabase, clave: string): Promise<T | null> {
  const fila = await db.getFirstAsync<{ json: string }>('SELECT json FROM cache WHERE clave = ?', clave);
  return fila ? (JSON.parse(fila.json) as T) : null;
}

export async function borrarCache(db: SQLiteDatabase, prefijo: string) {
  await db.runAsync('DELETE FROM cache WHERE clave LIKE ?', `${prefijo}%`);
}

/**
 * Pide a la API; si anduvo, guarda la respuesta y la devuelve. Si no hubo red,
 * devuelve la última guardada. Un error de verdad (404, 409…) se devuelve tal
 * cual: la caché sólo tapa la falta de conexión, no los rechazos del servidor.
 */
export async function conCache<T>(
  db: SQLiteDatabase,
  clave: string,
  pedir: () => Promise<Respuesta<T>>,
): Promise<Respuesta<T>> {
  const r = await pedir();
  if (!esError(r)) {
    await guardarCache(db, clave, r.datos);
    return r;
  }
  if (!esSinRed(r)) return r;
  const guardado = await leerCache<T>(db, clave);
  return guardado !== null ? ok(guardado) : r;
}
