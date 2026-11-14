import type { SQLiteDatabase } from 'expo-sqlite';

import {
  diasBloqueadosHoy,
  espacios,
  fijas,
  reservaPuertaDemo,
  reservasHistorial,
  turnosBloqueadosHoy,
  usuariosPrueba,
} from '@/mocks/catalogo';
import { sembrarMedios } from '@/persistencia/medios';
import type { Reserva } from '@/tipos';

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
    CREATE TABLE IF NOT EXISTS reservas_fijas (
      id TEXT PRIMARY KEY NOT NULL,
      espacioId TEXT NOT NULL,
      titular TEXT NOT NULL,
      dia INTEGER NOT NULL,
      inicio TEXT NOT NULL,
      fin TEXT NOT NULL,
      desde TEXT NOT NULL,
      hasta TEXT,
      activa INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS dias_bloqueados (
      espacioId TEXT NOT NULL,
      fecha TEXT NOT NULL,
      motivo TEXT NOT NULL,
      creadoEn TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (espacioId, fecha)
    );
    CREATE TABLE IF NOT EXISTS turnos_bloqueados (
      espacioId TEXT NOT NULL,
      fecha TEXT NOT NULL,
      inicio TEXT NOT NULL,
      motivo TEXT NOT NULL,
      creadoEn TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (espacioId, fecha, inicio)
    );
    CREATE TABLE IF NOT EXISTS precios_espacio (
      espacioId TEXT PRIMARY KEY NOT NULL,
      precio INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY NOT NULL,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL,
      telefono TEXT NOT NULL,
      rol TEXT NOT NULL,
      cancelacionesTardias INTEGER NOT NULL,
      ausencias INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS avisos (
      id TEXT PRIMARY KEY NOT NULL,
      usuarioId TEXT NOT NULL,
      reservaId TEXT,
      mensaje TEXT NOT NULL,
      creadoEn TEXT NOT NULL
    );
  `);

  // Bases creadas antes de guardar la fecha de creación de cada bloqueo.
  for (const tabla of ['dias_bloqueados', 'turnos_bloqueados']) {
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tabla})`);
    if (!cols.some((c) => c.name === 'creadoEn')) {
      await db.execAsync(`ALTER TABLE ${tabla} ADD COLUMN creadoEn TEXT NOT NULL DEFAULT ''`);
    }
  }

  const fila = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM reservas');
  if (!fila || fila.c === 0) {
    for (const r of reservasHistorial()) {
      await insertarReserva(db, r);
    }
  }

  const demo = reservaPuertaDemo();
  await db.runAsync('DELETE FROM reservas WHERE id = ?', demo.id);
  await insertarReserva(db, demo);

  const nFijas = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM reservas_fijas');
  if (!nFijas || nFijas.c === 0) {
    for (const f of fijas) {
      await db.runAsync(
        `INSERT INTO reservas_fijas (id, espacioId, titular, dia, inicio, fin, desde, hasta, activa)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        f.id,
        f.espacioId,
        f.titular,
        f.dia,
        f.inicio,
        f.fin,
        f.desde,
        f.hasta,
        f.activa ? 1 : 0,
      );
    }
  }

  const nDias = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM dias_bloqueados');
  if (!nDias || nDias.c === 0) {
    for (const d of diasBloqueadosHoy()) {
      await db.runAsync(
        'INSERT INTO dias_bloqueados (espacioId, fecha, motivo) VALUES (?, ?, ?)',
        d.espacioId,
        d.fecha,
        d.motivo,
      );
    }
  }

  const nTurnos = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM turnos_bloqueados');
  if (!nTurnos || nTurnos.c === 0) {
    for (const t of turnosBloqueadosHoy()) {
      await db.runAsync(
        'INSERT INTO turnos_bloqueados (espacioId, fecha, inicio, motivo) VALUES (?, ?, ?, ?)',
        t.espacioId,
        t.fecha,
        t.inicio,
        t.motivo,
      );
    }
  }

  const nPrecios = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM precios_espacio');
  if (!nPrecios || nPrecios.c === 0) {
    for (const e of espacios) {
      await db.runAsync(
        'INSERT INTO precios_espacio (espacioId, precio) VALUES (?, ?)',
        e.id,
        e.precioPorHora,
      );
    }
  }

  const nUsuarios = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM usuarios');
  if (!nUsuarios || nUsuarios.c === 0) {
    for (const u of usuariosPrueba) {
      await db.runAsync(
        `INSERT INTO usuarios (id, nombre, email, telefono, rol, cancelacionesTardias, ausencias)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        u.id,
        u.nombre,
        u.email,
        u.telefono,
        u.rol,
        u.cancelacionesTardias,
        u.ausencias,
      );
    }
  }

  await sembrarMedios(db);
}

async function insertarReserva(db: SQLiteDatabase, r: Reserva) {
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
