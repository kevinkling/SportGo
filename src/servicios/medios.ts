import type { SQLiteDatabase } from 'expo-sqlite';

export async function portadasDeEspacios(db: SQLiteDatabase): Promise<Record<string, string>> {
  const filas = await db.getAllAsync<{ espacioId: string; ruta: string }>(
    'SELECT espacioId, ruta FROM fotos_espacio WHERE orden = 0',
  );
  return Object.fromEntries(filas.map((fila) => [fila.espacioId, fila.ruta]));
}

export async function fotosDeEspacio(db: SQLiteDatabase, espacioId: string): Promise<string[]> {
  const filas = await db.getAllAsync<{ ruta: string }>(
    'SELECT ruta FROM fotos_espacio WHERE espacioId = ? ORDER BY orden ASC',
    espacioId,
  );
  return filas.map((fila) => fila.ruta);
}

export async function videoDeEspacio(db: SQLiteDatabase, espacioId: string): Promise<string | null> {
  const fila = await db.getFirstAsync<{ ruta: string }>('SELECT ruta FROM videos_espacio WHERE espacioId = ?', espacioId);
  return fila?.ruta ?? null;
}
