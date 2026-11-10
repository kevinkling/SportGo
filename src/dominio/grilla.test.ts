import { armarGrilla, esCancelacionTardia, faseTurno, puedeSumarReserva, turnoReservable } from '@/dominio/grilla';
import type { Reserva, ReservaFija } from '@/tipos';

const fijas: ReservaFija[] = [
  {
    id: 'fij-07',
    espacioId: 'esp-02',
    titular: 'Grupo de los martes',
    dia: 2,
    inicio: '21:00',
    fin: '22:00',
    desde: '2026-03-01',
    hasta: null,
    activa: true,
  },
];

function entrada(fecha: string, extra?: Partial<Parameters<typeof armarGrilla>[0]>) {
  return {
    espacioId: 'esp-02',
    fecha,
    precio: 12000,
    fijas,
    reservas: [] as Reserva[],
    diasBloqueados: [] as { espacioId: string; fecha: string; motivo: string }[],
    turnosBloqueados: [] as { espacioId: string; fecha: string; inicio: string; motivo: string }[],
    ...extra,
  };
}

describe('armarGrilla', () => {
  it('marca fija los martes a las 21', () => {
    const g = armarGrilla(entrada('2026-11-10'));
    const t = g.turnos.find((x) => x.inicio === '21:00');
    expect(t?.estado).toBe('fijo');
    expect(t?.motivoBloqueo).toBe('Grupo de los martes');
  });

  it('cierra el día por lluvia', () => {
    const g = armarGrilla(
      entrada('2026-11-10', {
        diasBloqueados: [{ espacioId: 'esp-02', fecha: '2026-11-10', motivo: 'Lluvia' }],
      }),
    );
    expect(g.bloqueado).toBe(true);
    expect(g.turnos).toHaveLength(0);
  });

  it('deja un día sin huecos libres', () => {
    const turnosBloqueados = Array.from({ length: 16 }, (_, i) => ({
      espacioId: 'esp-02',
      fecha: '2026-11-12',
      inicio: `${String(i + 8).padStart(2, '0')}:00`,
      motivo: 'Torneo',
    }));
    const g = armarGrilla(entrada('2026-11-12', { turnosBloqueados }));
    expect(g.turnos.every((t) => t.estado !== 'libre')).toBe(true);
  });

  it('no deja reservar una hora que ya pasó', () => {
    const g = armarGrilla(entrada('2026-11-08'));
    const t = g.turnos.find((x) => x.inicio === '09:00');
    const ahora = new Date('2026-11-08T16:40:00-03:00');
    expect(t && turnoReservable(t, ahora)).toBe(false);
    expect(t && faseTurno(t.fecha, t.inicio, t.fin, ahora)).toBe('paso');
  });
});

describe('reservas', () => {
  it('corta en tres activas', () => {
    expect(puedeSumarReserva(3)).toBe(false);
    expect(puedeSumarReserva(2)).toBe(true);
  });

  it('es tardía después de las cuatro horas', () => {
    const limite = '2026-11-08T15:00:00-03:00';
    expect(esCancelacionTardia(limite, new Date('2026-11-08T16:00:00-03:00'))).toBe(true);
    expect(esCancelacionTardia(limite, new Date('2026-11-08T14:00:00-03:00'))).toBe(false);
  });
});
