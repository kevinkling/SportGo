import { calcularMomentoRecordatorio } from '@/dominio/recordatorio';

describe('calcularMomentoRecordatorio', () => {
  it('resta dos horas al inicio del turno', () => {
    const m = calcularMomentoRecordatorio('2026-11-14', '21:00', new Date('2026-11-13T12:00:00-03:00'));
    expect(m?.toISOString()).toBe(new Date('2026-11-14T19:00:00-03:00').toISOString());
  });

  it('queda en la madrugada del mismo día si el turno es a las 08:00', () => {
    const m = calcularMomentoRecordatorio('2026-11-14', '08:00', new Date('2026-11-13T22:00:00-03:00'));
    expect(m?.toISOString()).toBe(new Date('2026-11-14T06:00:00-03:00').toISOString());
  });

  it('no programa si el recordatorio ya pasó', () => {
    expect(calcularMomentoRecordatorio('2026-11-14', '21:00', new Date('2026-11-14T19:30:00-03:00'))).toBeNull();
  });

  it('no programa si el turno queda a menos de dos horas', () => {
    expect(calcularMomentoRecordatorio('2026-11-14', '21:00', new Date('2026-11-14T20:00:00-03:00'))).toBeNull();
  });
});
