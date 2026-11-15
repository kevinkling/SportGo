import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import type { MetaLista } from '@/tipos';

/**
 * El PRD fija una sola forma de respuesta para toda la API:
 *   éxito -> { "datos": ..., "meta": { total, pagina, porPagina } }
 *   error -> { "error": { "codigo": "...", "mensaje": "..." } }
 * Estas dos funciones son el único lugar donde se arma esa forma.
 */

export function ok<T>(c: Context, datos: T, meta?: Partial<MetaLista>) {
  const total = Array.isArray(datos) ? datos.length : 1;
  return c.json({
    datos,
    meta: {
      total: meta?.total ?? total,
      pagina: meta?.pagina ?? 1,
      porPagina: meta?.porPagina ?? total,
    } satisfies MetaLista,
  });
}

export function fallo(c: Context, estado: ContentfulStatusCode, codigo: string, mensaje: string) {
  return c.json({ error: { codigo, mensaje } }, estado);
}
