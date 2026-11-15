import type { Coordenadas } from '@/tipos';

export interface ComplejoEnMapa {
  nombre: string;
  coordenadas: Coordenadas;
}

const RADIO_TIERRA_M = 6_371_000;

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

export function metrosEntre(a: Coordenadas, b: Coordenadas): number {
  const dLat = aRadianes(b.latitud - a.latitud);
  const dLon = aRadianes(b.longitud - a.longitud);
  const lat1 = aRadianes(a.latitud);
  const lat2 = aRadianes(b.latitud);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function complejosUnicos(
  espacios: { complejo: string; coordenadas: Coordenadas }[],
): ComplejoEnMapa[] {
  const vistos = new Map<string, ComplejoEnMapa>();
  for (const espacio of espacios) {
    if (!vistos.has(espacio.complejo)) {
      vistos.set(espacio.complejo, {
        nombre: espacio.complejo,
        coordenadas: espacio.coordenadas,
      });
    }
  }
  return [...vistos.values()];
}

export function complejoMasCercano(
  origen: Coordenadas,
  complejos: ComplejoEnMapa[],
): ComplejoEnMapa | null {
  if (complejos.length === 0) return null;
  return complejos.reduce((mejor, actual) =>
    metrosEntre(origen, actual.coordenadas) < metrosEntre(origen, mejor.coordenadas) ? actual : mejor,
  );
}
