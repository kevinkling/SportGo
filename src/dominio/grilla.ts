import { fechaISO, horaISO, instanteTurno } from '@/dominio/fechas';
import type { DiaBloqueado, Reserva, ReservaFija, Turno, TurnoBloqueado } from '@/tipos';

export const HORAS = Array.from({ length: 16 }, (_, i) => {
  const h = i + 8;
  const inicio = `${String(h).padStart(2, '0')}:00`;
  const fin = h + 1 === 24 ? '24:00' : `${String(h + 1).padStart(2, '0')}:00`;
  return { inicio, fin };
});

export function idTurno(espacioId: string, fecha: string, inicio: string): string {
  const nro = espacioId.replace(/\D/g, '').padStart(2, '0');
  return `tur-${nro}${fecha.replaceAll('-', '')}-${inicio.slice(0, 2)}`;
}

export function fechaDesdeTurnoId(turnoId: string): string | null {
  const m = turnoId.match(/^tur-\d{2}(\d{4})(\d{2})(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export type FaseTurno = 'paso' | 'curso' | 'futuro';

export function faseTurno(fecha: string, inicio: string, fin: string, ahora: Date): FaseTurno {
  const ini = instanteTurno(fecha, inicio);
  const finDt = instanteTurno(fecha, fin);
  if (ahora.getTime() >= finDt.getTime()) return 'paso';
  if (ahora.getTime() >= ini.getTime()) return 'curso';
  return 'futuro';
}

export function turnoReservable(turno: Turno, ahora: Date): boolean {
  return turno.estado === 'libre' && faseTurno(turno.fecha, turno.inicio, turno.fin, ahora) === 'futuro';
}

export function cancelableHastaIso(fecha: string, inicio: string): string {
  const limite = new Date(instanteTurno(fecha, inicio).getTime() - 4 * 60 * 60 * 1000);
  return `${fechaISO(limite)}T${horaISO(limite)}:00-03:00`;
}

export function esCancelacionTardia(cancelableHasta: string, ahora: Date): boolean {
  return ahora.getTime() > Date.parse(cancelableHasta);
}

export function puedeSumarReserva(activas: number, tope = 3): boolean {
  return activas < tope;
}

export interface EntradaGrilla {
  espacioId: string;
  fecha: string;
  precio: number;
  fijas: ReservaFija[];
  reservas: Reserva[];
  diasBloqueados: DiaBloqueado[];
  turnosBloqueados: TurnoBloqueado[];
}

export interface ResultadoGrilla {
  bloqueado: boolean;
  motivo: string | null;
  turnos: Turno[];
}

export function armarGrilla(entrada: EntradaGrilla): ResultadoGrilla {
  const diaCerrado = entrada.diasBloqueados.find(
    (d) => d.espacioId === entrada.espacioId && d.fecha === entrada.fecha,
  );
  if (diaCerrado) {
    return { bloqueado: true, motivo: diaCerrado.motivo, turnos: [] };
  }

  const diaSemana = (() => {
    const [anio, mes, dia] = entrada.fecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia).getDay();
  })();

  const turnos = HORAS.map(({ inicio, fin }) => {
    const id = idTurno(entrada.espacioId, entrada.fecha, inicio);
    const bloqueo = entrada.turnosBloqueados.find(
      (t) => t.espacioId === entrada.espacioId && t.fecha === entrada.fecha && t.inicio === inicio,
    );
    const fija = entrada.fijas.find(
      (f) =>
        f.activa &&
        f.espacioId === entrada.espacioId &&
        f.dia === diaSemana &&
        f.inicio === inicio &&
        f.desde <= entrada.fecha &&
        (f.hasta === null || f.hasta >= entrada.fecha),
    );
    const reserva = entrada.reservas.find(
      (r) => r.espacioId === entrada.espacioId && r.turnoId === id && r.estado === 'confirmada',
    );

    let estado: Turno['estado'] = 'libre';
    let reservaId: string | null = null;
    let motivoBloqueo: string | null = null;

    if (bloqueo) {
      estado = 'mantenimiento';
      motivoBloqueo = bloqueo.motivo;
    } else if (fija) {
      estado = 'fijo';
      motivoBloqueo = fija.titular;
    } else if (reserva) {
      estado = 'reservado';
      reservaId = reserva.id;
    }

    return {
      id,
      espacioId: entrada.espacioId,
      fecha: entrada.fecha,
      inicio,
      fin,
      estado,
      reservaId,
      motivoBloqueo,
      precio: entrada.precio,
    };
  });

  return { bloqueado: false, motivo: null, turnos };
}

export function ahoraEnArgentina(): { fecha: string; hora: string } {
  const ahora = new Date();
  return { fecha: fechaISO(ahora), hora: horaISO(ahora) };
}
