import type { SQLiteDatabase } from 'expo-sqlite';

import { reservasHistorial } from '@/mocks/catalogo';
import { sembrarMedios } from '@/persistencia/medios';

export async function migrar(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS reservas (
      id TEXT PRIMARY KEY NOT NULL,
      turnoId TEXT NOT NULL,
      espacioId TEXT NOT NULL,
      usuarioId TEXT NOT NULL,
      cantidadPersonas INTEGER NOT NULL,
      codigoQr TEXT NOT NULL,
      estado TEXT NOT NULL,
      ingresoEn TEXT,
      creadaEn TEXT NOT NULL,
      cancelableHasta TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS fotos_espacio (
      espacioId TEXT NOT NULL,
      orden INTEGER NOT NULL,
      ruta TEXT NOT NULL,
      PRIMARY KEY (espacioId, orden)
    );
    CREATE TABLE IF NOT EXISTS videos_espacio (
      espacioId TEXT PRIMARY KEY NOT NULL,
      ruta TEXT NOT NULL
    );
  `);

  const fila = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM reservas');
  if (!fila || fila.c === 0) {
    for (const r of reservasHistorial()) {
      await db.runAsync(
        `INSERT INTO reservas (id, turnoId, espacioId, usuarioId, cantidadPersonas, codigoQr, estado, ingresoEn, creadaEn, cancelableHasta)
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
  }

  await sembrarMedios(db);
}
