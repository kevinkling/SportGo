import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Versión del esquema local. Subila cuando cambien las tablas; `migrar` limpia
 * lo viejo y vuelve a crear lo nuevo. Los datos reales viven en el servidor:
 * acá sólo hay copias, así que borrar tablas nunca pierde nada que no se pueda
 * volver a pedir.
 */
const VERSION = 2;

export async function migrar(db: SQLiteDatabase) {
  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const actual = fila?.user_version ?? 0;

  if (actual < VERSION) {
    // Hasta la versión 1 la app guardaba acá los datos de prueba (fijas, bloqueos,
    // precios, usuarios, avisos). Ahora los sirve la API.
    await db.execAsync(`
      DROP TABLE IF EXISTS reservas;
      DROP TABLE IF EXISTS fotos_espacio;
      DROP TABLE IF EXISTS videos_espacio;
      DROP TABLE IF EXISTS reservas_fijas;
      DROP TABLE IF EXISTS dias_bloqueados;
      DROP TABLE IF EXISTS turnos_bloqueados;
      DROP TABLE IF EXISTS precios_espacio;
      DROP TABLE IF EXISTS usuarios;
      DROP TABLE IF EXISTS avisos;
    `);
  }

  await db.execAsync(`
    -- Mis reservas, con su código QR: tienen que verse en la puerta, sin señal.
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
    -- Fotos y video de cada cancha ya descargados al teléfono (ruta local).
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
    -- Última respuesta buena de la API para cada pedido de lectura.
    CREATE TABLE IF NOT EXISTS cache (
      clave TEXT PRIMARY KEY NOT NULL,
      json TEXT NOT NULL,
      guardadoEn TEXT NOT NULL
    );
  `);

  if (actual < VERSION) {
    await db.execAsync(`PRAGMA user_version = ${VERSION}`);
  }
}
