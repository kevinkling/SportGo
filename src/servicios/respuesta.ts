import type { MetaLista, RespuestaError, RespuestaOk } from '@/tipos';

export function ok<T>(datos: T, meta?: Partial<MetaLista>): RespuestaOk<T> {
  const total = Array.isArray(datos) ? datos.length : 1;
  return {
    datos,
    meta: {
      total: meta?.total ?? total,
      pagina: meta?.pagina ?? 1,
      porPagina: meta?.porPagina ?? total,
    },
  };
}

export function fallo(codigo: string, mensaje: string): RespuestaError {
  return { error: { codigo, mensaje } };
}

export function esperar(ms = 180): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
