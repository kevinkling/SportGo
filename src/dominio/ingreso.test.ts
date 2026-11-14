import { evaluarIngreso } from '@/dominio/ingreso';
import { agruparFijas, expandirFranja, solapaFija } from '@/dominio/fijas';
import type { Reserva, ReservaFija } from '@/tipos';

const base: Reserva = {
  id: 'res-1',
  turnoId: 'tur-0220261113-19',
  espacioId: 'esp-02',
  usuarioId: 'usr-207',
  cantidadPersonas: 10,
  codigoQr: 'VGY-1180-0219-19',
  estado: 'confirmada',
  ingresoEn: null,
  creadaEn: '2026-11-10T21:04:00-03:00',
  cancelableHasta: '2026-11-13T15:00:00-03:00',
};

const ahora = new Date('2026-11-13T18:00:00-03:00');

describe('evaluarIngreso', () => {
  it('acepta un código de hoy en esa cancha', () => {
    expect(evaluarIngreso(base, ahora, 'esp-02')).toEqual({ ok: true });
  });

  it('rechaza otro día', () => {
    const r = evaluarIngreso(base, new Date('2026-11-14T10:00:00-03:00'));
    expect('codigo' in r && r.codigo).toBe('QR_OTRO_DIA');
  });

  it('rechaza otra cancha', () => {
    const r = evaluarIngreso(base, ahora, 'esp-01');
    expect('codigo' in r && r.codigo).toBe('QR_OTRA_CANCHA');
  });

  it('rechaza código inexistente', () => {
    const r = evaluarIngreso(null, ahora);
    expect('codigo' in r && r.codigo).toBe('QR_INVALIDO');
  });

  it('rechaza si ya ingresó', () => {
    const r = evaluarIngreso({ ...base, estado: 'cumplida', ingresoEn: '2026-11-13T19:05:00-03:00' }, ahora);
    expect('codigo' in r && r.codigo).toBe('YA_INGRESO');
  });
});

describe('solapaFija', () => {
  const existente: ReservaFija = {
    id: 'fij-07',
    espacioId: 'esp-02',
    titular: 'Grupo de los martes',
    dia: 2,
    inicio: '21:00',
    fin: '22:00',
    desde: '2026-03-01',
    hasta: null,
    activa: true,
  };

  it('detecta el mismo espacio, día y hora', () => {
    expect(
      solapaFija([existente], {
        ...existente,
        id: 'fij-nuevo',
        titular: 'Otro',
        desde: '2026-11-01',
        hasta: null,
      }),
    ).toBe(true);
  });

  it('deja pasar otro horario', () => {
    expect(solapaFija([existente], { ...existente, id: 'fij-x', inicio: '20:00', fin: '21:00' })).toBe(false);
  });
});

describe('franjas de fijas', () => {
  it('expande 13 a 20 en siete horas', () => {
    const horas = expandirFranja({ dia: 0, inicio: '13:00', fin: '20:00' });
    expect(horas).toHaveLength(7);
    expect(horas[0]).toEqual({ inicio: '13:00', fin: '14:00' });
    expect(horas[6]).toEqual({ inicio: '19:00', fin: '20:00' });
  });

  it('agrupa horas seguidas y separa las que no lo son', () => {
    const base = {
      espacioId: 'esp-02',
      titular: 'Grupo',
      dia: 1 as const,
      desde: '2026-11-01',
      hasta: null,
      activa: true,
    };
    const grupos = agruparFijas([
      { ...base, id: 'a', inicio: '10:00', fin: '11:00' },
      { ...base, id: 'b', inicio: '11:00', fin: '12:00' },
      { ...base, id: 'c', inicio: '20:00', fin: '21:00' },
    ]);
    expect(grupos).toHaveLength(2);
    expect(grupos[0]).toMatchObject({ inicio: '10:00', fin: '12:00', ids: ['a', 'b'] });
    expect(grupos[1]).toMatchObject({ inicio: '20:00', fin: '21:00' });
  });
});
