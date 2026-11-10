import { fechaISO, sumarDias } from '@/dominio/fechas';
import type { Deporte, DiaBloqueado, Espacio, Reserva, ReservaFija, TurnoBloqueado, Usuario } from '@/tipos';

const POLI = { latitud: -31.8642, longitud: -59.0281 };
const BERDUC = { latitud: -31.872, longitud: -59.018 };

export const deportes: Deporte[] = [
  { id: 'dep-futbol5', nombre: 'Fútbol 5', icono: 'football-outline', color: '#1f7a3e' },
  { id: 'dep-futbol11', nombre: 'Fútbol 11', icono: 'football-outline', color: '#2d5a32' },
  { id: 'dep-basquet', nombre: 'Básquet', icono: 'basketball-outline', color: '#a86832' },
  { id: 'dep-voley', nombre: 'Vóley', icono: 'tennisball-outline', color: '#c9842a' },
  { id: 'dep-tenis', nombre: 'Tenis', icono: 'tennisball-outline', color: '#3e6b45' },
  { id: 'dep-gimnasio', nombre: 'Gimnasio', icono: 'barbell-outline', color: '#31404d' },
];

function espacio(
  id: string,
  nombre: string,
  deporteId: string,
  complejo: 'Polideportivo Municipal' | 'Parque Berduc',
  superficie: string,
  iluminacion: boolean,
  techado: boolean,
  capacidad: number,
  precioPorHora: number,
  video: boolean,
  reglas: string,
): Espacio {
  const poli = complejo === 'Polideportivo Municipal';
  return {
    id,
    nombre,
    deporteId,
    complejo,
    superficie,
    techado,
    iluminacion,
    capacidad,
    precioPorHora,
    coordenadas: poli ? POLI : BERDUC,
    imagenes: [`https://api.villaguay.gob.ar/img/${id}.jpg`],
    videoUrl: video ? `https://api.villaguay.gob.ar/v/${id}.mp4` : null,
    reglas,
    activo: true,
  };
}

export const espacios: Espacio[] = [
  espacio('esp-01', 'Cancha 1 — Fútbol 5', 'dep-futbol5', 'Polideportivo Municipal', 'césped sintético', true, false, 10, 12000, true, 'No se permite calzado con tapones de aluminio.'),
  espacio('esp-02', 'Cancha 2 — Fútbol 5', 'dep-futbol5', 'Polideportivo Municipal', 'césped sintético', true, false, 10, 12000, true, 'No se permite calzado con tapones de aluminio.'),
  espacio('esp-03', 'Cancha 11 — Fútbol 11', 'dep-futbol11', 'Polideportivo Municipal', 'césped natural', true, false, 22, 18000, true, 'No se permite calzado con tapones de aluminio.'),
  espacio('esp-04', 'Básquet 1', 'dep-basquet', 'Polideportivo Municipal', 'cemento', true, false, 10, 8000, true, 'Se juega con zapatillas, no con botines.'),
  espacio('esp-05', 'Básquet 2', 'dep-basquet', 'Polideportivo Municipal', 'cemento', true, false, 10, 8000, false, 'Se juega con zapatillas, no con botines.'),
  espacio('esp-06', 'Básquet 3', 'dep-basquet', 'Polideportivo Municipal', 'parquet', true, true, 10, 8000, false, 'Se juega con zapatillas, no con botines.'),
  espacio('esp-07', 'Vóley 1', 'dep-voley', 'Polideportivo Municipal', 'piso sintético', true, false, 12, 8000, true, 'La red queda armada.'),
  espacio('esp-08', 'Vóley 2', 'dep-voley', 'Polideportivo Municipal', 'piso sintético', true, false, 12, 8000, false, 'La red queda armada.'),
  espacio('esp-09', 'Tenis 1', 'dep-tenis', 'Parque Berduc', 'polvo de ladrillo', true, false, 4, 6000, true, 'Traé la raqueta. La red es fija.'),
  espacio('esp-10', 'Tenis 2', 'dep-tenis', 'Parque Berduc', 'polvo de ladrillo', false, false, 4, 6000, false, 'Traé la raqueta. Esta cancha no tiene luz.'),
  espacio('esp-11', 'Gimnasio', 'dep-gimnasio', 'Polideportivo Municipal', 'piso de goma', true, true, 30, 10000, true, 'Calzado de piso. Sin botines.'),
];

export const usuarioPrueba: Usuario = {
  id: 'usr-207',
  nombre: 'Emiliano Ruiz',
  email: 'emiliano@mail.com',
  telefono: '3455-401122',
  rol: 'jugador',
  espaciosFavoritos: ['esp-02'],
  cancelacionesTardias: 1,
  ausencias: 0,
};

export const CLAVE_PRUEBA = '1234';

export const fijas: ReservaFija[] = [
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
  {
    id: 'fij-08',
    espacioId: 'esp-02',
    titular: 'Escuela N.º 12',
    dia: 2,
    inicio: '08:00',
    fin: '09:00',
    desde: '2026-03-01',
    hasta: null,
    activa: true,
  },
  {
    id: 'fij-09',
    espacioId: 'esp-02',
    titular: 'Escuela N.º 12',
    dia: 2,
    inicio: '09:00',
    fin: '10:00',
    desde: '2026-03-01',
    hasta: null,
    activa: true,
  },
  {
    id: 'fij-10',
    espacioId: 'esp-02',
    titular: 'Club Atlético Villaguay',
    dia: 2,
    inicio: '18:00',
    fin: '19:00',
    desde: '2026-03-01',
    hasta: null,
    activa: true,
  },
  {
    id: 'fij-11',
    espacioId: 'esp-02',
    titular: 'Club Atlético Villaguay',
    dia: 2,
    inicio: '19:00',
    fin: '20:00',
    desde: '2026-03-01',
    hasta: null,
    activa: true,
  },
];

export function diasBloqueadosHoy(ahora = new Date()): DiaBloqueado[] {
  const hoy = fechaISO(ahora);
  return [
    {
      espacioId: 'esp-02',
      fecha: sumarDias(hoy, 1),
      motivo: 'Lluvia. La cancha 2 quedó impracticable.',
    },
  ];
}

export function turnosBloqueadosHoy(ahora = new Date()): TurnoBloqueado[] {
  const hoy = fechaISO(ahora);
  const enTres = sumarDias(hoy, 3);
  return [
    { espacioId: 'esp-02', fecha: hoy, inicio: '20:00', motivo: 'Césped anegado' },
    ...HORAS_MANTENIMIENTO.map((inicio) => ({
      espacioId: 'esp-02',
      fecha: enTres,
      inicio,
      motivo: inicio === '15:00' ? 'Pintura de líneas' : 'Cancha reservada para torneo interno',
    })),
  ];
}

const HORAS_MANTENIMIENTO = Array.from({ length: 16 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

export function reservasHistorial(ahora = new Date()): Reserva[] {
  const hoy = fechaISO(ahora);
  const pasada = sumarDias(hoy, -8);
  const pasada2 = sumarDias(hoy, -11);
  return [
    {
      id: 'res-hist-1',
      turnoId: `tur-02${pasada.replaceAll('-', '')}-20`,
      espacioId: 'esp-02',
      usuarioId: 'usr-207',
      cantidadPersonas: 10,
      codigoQr: 'VGY-1101-0820-20',
      estado: 'cumplida',
      ingresoEn: `${pasada}T20:05:00-03:00`,
      creadaEn: `${sumarDias(pasada, -3)}T21:00:00-03:00`,
      cancelableHasta: `${pasada}T16:00:00-03:00`,
    },
    {
      id: 'res-hist-2',
      turnoId: `tur-02${pasada2.replaceAll('-', '')}-21`,
      espacioId: 'esp-02',
      usuarioId: 'usr-207',
      cantidadPersonas: 10,
      codigoQr: 'VGY-1100-0821-21',
      estado: 'cancelada',
      ingresoEn: null,
      creadaEn: `${sumarDias(pasada2, -2)}T18:00:00-03:00`,
      cancelableHasta: `${pasada2}T17:00:00-03:00`,
    },
  ];
}

export let forzarErrorRed = false;

export function setForzarErrorRed(valor: boolean) {
  forzarErrorRed = valor;
}
