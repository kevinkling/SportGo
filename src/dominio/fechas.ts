const ZONA = 'America/Argentina/Buenos_Aires';

export function fechaISO(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
}

export function horaISO(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ahora);
  const hora = partes.find((p) => p.type === 'hour')?.value ?? '00';
  const minuto = partes.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hora}:${minuto}`;
}

export function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(Date.UTC(anio, mes - 1, dia + dias, 12, 0, 0));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function diaSemana(fecha: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(anio, mes - 1, dia).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function proximosSieteDias(desde: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(desde, i));
}

export function instanteTurno(fecha: string, hora: string): Date {
  const fin = hora === '24:00' ? '00:00' : hora;
  const extraDia = hora === '24:00' ? 1 : 0;
  const dia = extraDia ? sumarDias(fecha, 1) : fecha;
  return new Date(`${dia}T${fin}:00-03:00`);
}

export function tituloDia(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function nombreCortoDia(fecha: string): string {
  const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return nombres[diaSemana(fecha)];
}

export function numeroDia(fecha: string): number {
  return Number(fecha.slice(8));
}

export function isoConZona(ahora: Date = new Date()): string {
  const fecha = fechaISO(ahora);
  const hora = horaISO(ahora);
  return `${fecha}T${hora}:00-03:00`;
}
