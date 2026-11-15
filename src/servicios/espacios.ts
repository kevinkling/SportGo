import type { SQLiteDatabase } from 'expo-sqlite';

import { borrarCache, conCache, leerCache } from '@/persistencia/cache';
import { descargarMedios } from '@/persistencia/medios';
import { esSinRed, llamar } from '@/servicios/api';
import { fallo, ok } from '@/servicios/respuesta';
import { esError, type Deporte, type Espacio, type Respuesta } from '@/tipos';

export async function listarDeportes(db: SQLiteDatabase): Promise<Respuesta<Deporte[]>> {
  return conCache(db, 'deportes', () => llamar<Deporte[]>('GET', '/deportes'));
}

export async function listarEspacios(db: SQLiteDatabase): Promise<Respuesta<Espacio[]>> {
  const r = await conCache(db, 'espacios', () => llamar<Espacio[]>('GET', '/espacios'));
  // Sin esperar: la lista se muestra ya y las fotos se van bajando de fondo.
  if (!esError(r)) void descargarMedios(db, r.datos);
  return r;
}

export async function obtenerEspacio(db: SQLiteDatabase, id: string): Promise<Respuesta<Espacio>> {
  const r = await llamar<Espacio>('GET', `/espacios/${id}`);
  if (!esError(r) || !esSinRed(r)) return r;
  // Sin conexión: el espacio sale de la lista que se guardó la última vez.
  const lista = await leerCache<Espacio[]>(db, 'espacios');
  const espacio = lista?.find((e) => e.id === id);
  return espacio ? ok(espacio) : fallo('NO_ENCONTRADO', 'Ese espacio no está guardado en el teléfono.');
}

/** Llamar después de cambiar un precio: la lista guardada ya no vale. */
export async function olvidarEspacios(db: SQLiteDatabase) {
  await borrarCache(db, 'espacios');
}
