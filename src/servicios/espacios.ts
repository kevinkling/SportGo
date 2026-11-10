import { deportes, espacios, forzarErrorRed } from '@/mocks/catalogo';
import { esperar, fallo, ok } from '@/servicios/respuesta';
import type { Deporte, Espacio, Respuesta } from '@/tipos';

export async function listarDeportes(): Promise<Respuesta<Deporte[]>> {
  await esperar();
  return ok(deportes);
}

export async function listarEspacios(): Promise<Respuesta<Espacio[]>> {
  await esperar();
  if (forzarErrorRed) {
    return fallo('SIN_RED', 'No pudimos cargar los espacios. Probá de nuevo.');
  }
  return ok(espacios.filter((e) => e.activo));
}

export async function obtenerEspacio(id: string): Promise<Respuesta<Espacio>> {
  await esperar();
  const espacio = espacios.find((e) => e.id === id);
  if (!espacio) return fallo('NO_ENCONTRADO', 'Ese espacio no existe.');
  return ok(espacio);
}
