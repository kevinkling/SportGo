import { complejoMasCercano, complejosUnicos, metrosEntre } from '@/dominio/distancia';

const POLI = { latitud: -31.8642, longitud: -59.0281 };
const BERDUC = { latitud: -31.872, longitud: -59.018 };

const complejos = [
  { nombre: 'Polideportivo Municipal', coordenadas: POLI },
  { nombre: 'Parque Berduc', coordenadas: BERDUC },
];

describe('metrosEntre', () => {
  it('da cero cuando el punto es el mismo', () => {
    expect(metrosEntre(POLI, POLI)).toBe(0);
  });

  it('mide alrededor de 1,3 km entre los dos complejos', () => {
    const metros = metrosEntre(POLI, BERDUC);
    expect(metros).toBeGreaterThan(1200);
    expect(metros).toBeLessThan(1500);
  });
});

describe('complejosUnicos', () => {
  it('agrupa por nombre de complejo', () => {
    const unicos = complejosUnicos([
      { complejo: 'Polideportivo Municipal', coordenadas: POLI },
      { complejo: 'Polideportivo Municipal', coordenadas: POLI },
      { complejo: 'Parque Berduc', coordenadas: BERDUC },
    ]);
    expect(unicos).toHaveLength(2);
    expect(unicos.map((c) => c.nombre)).toEqual(['Polideportivo Municipal', 'Parque Berduc']);
  });
});

describe('complejoMasCercano', () => {
  it('devuelve null si no hay complejos', () => {
    expect(complejoMasCercano(POLI, [])).toBeNull();
  });

  it('elige el Polideportivo si el usuario está al lado', () => {
    const cerca = { latitud: POLI.latitud + 0.001, longitud: POLI.longitud };
    expect(complejoMasCercano(cerca, complejos)?.nombre).toBe('Polideportivo Municipal');
  });

  it('elige Parque Berduc si el usuario está más cerca de ahí', () => {
    const cerca = { latitud: BERDUC.latitud, longitud: BERDUC.longitud + 0.001 };
    expect(complejoMasCercano(cerca, complejos)?.nombre).toBe('Parque Berduc');
  });
});
