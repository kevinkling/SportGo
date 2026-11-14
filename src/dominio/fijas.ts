import type { ReservaFija } from '@/tipos';

export function rangosSeSolapan(desdeA: string, hastaA: string | null, desdeB: string, hastaB: string | null): boolean {
  const finA = hastaA ?? '9999-12-31';
  const finB = hastaB ?? '9999-12-31';
  return desdeA <= finB && desdeB <= finA;
}

export function solapaFija(existentes: ReservaFija[], candidata: ReservaFija): boolean {
  return existentes.some(
    (f) =>
      f.activa &&
      f.id !== candidata.id &&
      f.espacioId === candidata.espacioId &&
      f.dia === candidata.dia &&
      f.inicio === candidata.inicio &&
      rangosSeSolapan(f.desde, f.hasta, candidata.desde, candidata.hasta),
  );
}

function dos(n: number) {
  return String(n).padStart(2, '0');
}

/** Hora entera de "HH:MM" (24:00 vale 24). */
export function horaEntera(hora: string): number {
  return Number(hora.slice(0, 2));
}

export function textoHora(h: number): string {
  return `${dos(h)}:00`;
}

export interface FranjaFija {
  dia: ReservaFija['dia'];
  /** "HH:00" */
  inicio: string;
  /** "HH:00", puede ser "24:00" */
  fin: string;
}

/** Una franja de varias horas se guarda como una fija por cada hora (la grilla es de 1 hora). */
export function expandirFranja(franja: FranjaFija): { inicio: string; fin: string }[] {
  const horas: { inicio: string; fin: string }[] = [];
  for (let h = horaEntera(franja.inicio); h < horaEntera(franja.fin); h++) {
    horas.push({ inicio: textoHora(h), fin: textoHora(h + 1) });
  }
  return horas;
}

export interface GrupoFija {
  ids: string[];
  espacioId: string;
  titular: string;
  dia: ReservaFija['dia'];
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
  activa: boolean;
}

/** Junta horas seguidas de la misma fija para mostrarlas como "13:00 a 20:00". */
export function agruparFijas(fijas: ReservaFija[]): GrupoFija[] {
  const orden = [...fijas].sort(
    (a, b) =>
      a.espacioId.localeCompare(b.espacioId) ||
      a.titular.localeCompare(b.titular) ||
      a.dia - b.dia ||
      a.desde.localeCompare(b.desde) ||
      (a.hasta ?? '').localeCompare(b.hasta ?? '') ||
      a.inicio.localeCompare(b.inicio),
  );
  const grupos: GrupoFija[] = [];
  for (const f of orden) {
    const ultimo = grupos[grupos.length - 1];
    if (
      ultimo &&
      ultimo.espacioId === f.espacioId &&
      ultimo.titular === f.titular &&
      ultimo.dia === f.dia &&
      ultimo.desde === f.desde &&
      ultimo.hasta === f.hasta &&
      ultimo.activa === f.activa &&
      ultimo.fin === f.inicio
    ) {
      ultimo.ids.push(f.id);
      ultimo.fin = f.fin;
    } else {
      grupos.push({
        ids: [f.id],
        espacioId: f.espacioId,
        titular: f.titular,
        dia: f.dia,
        inicio: f.inicio,
        fin: f.fin,
        desde: f.desde,
        hasta: f.hasta,
        activa: f.activa,
      });
    }
  }
  return grupos;
}
