import type { SQLiteDatabase } from 'expo-sqlite';

import { deportes, espacios, forzarErrorRed } from '@/mocks/catalogo';
import { leerPrecios } from '@/persistencia/gestion';
import { esperar, fallo, ok } from '@/servicios/respuesta';
import type { Deporte, Espacio, Respuesta } from '@/tipos';

function conPrecio(espacio: Espacio, precios: Record<string, number>): Espacio {
  return { ...espacio, precioPorHora: precios[espacio.id] ?? espacio.precioPorHora };
}

export async function listarDeportes(): Promise<Respuesta<Deporte[]>> {
  await esperar();
  return ok(deportes);
}

export async function listarEspacios(db: SQLiteDatabase): Promise<Respuesta<Espacio[]>> {
  await esperar();
  if (forzarErrorRed) {
    return fallo('SIN_RED', 'No pudimos cargar los espacios. Probá de nuevo.');
  }
  const precios = await leerPrecios(db);
  return ok(espacios.filter((e) => e.activo).map((e) => conPrecio(e, precios)));
}

export async function obtenerEspacio(db: SQLiteDatabase, id: string): Promise<Respuesta<Espacio>> {
  await esperar();
  const espacio = espacios.find((e) => e.id === id);
  if (!espacio) return fallo('NO_ENCONTRADO', 'Ese espacio no existe.');
  const precios = await leerPrecios(db);
  return ok(conPrecio(espacio, precios));
}
