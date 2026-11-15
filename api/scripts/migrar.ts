/**
 * Carga los datos fijos del municipio y los tres usuarios de prueba. Se puede
 * correr las veces que haga falta.
 *
 *   pnpm migrar          semilla + usuarios
 *   pnpm migrar --demo   además, los casos feos del PRD calculados contra hoy
 *
 * Las tablas (sql/01-esquema.sql) se crean UNA vez desde el SQL Editor de Supabase,
 * que corre como `postgres`. El rol con el que entra la API (sportgo_api) no puede
 * crear tablas, y está bien que no pueda.
 */
import { fileURLToPath } from 'node:url';

import { fechaISO, horaISO, isoConZona, sumarDias } from '@/dominio/fechas';
import { cancelableHastaIso, HORAS, idTurno } from '@/dominio/grilla';

import { sql } from '../src/db.ts';
import { hashearClave } from '../src/sesion.ts';

const CLAVE_PRUEBA = '1234';

const usuarios = [
  { id: 'usr-207', nombre: 'Emiliano Ruiz', email: 'emiliano@mail.com', telefono: '3455-401122', rol: 'jugador', fav: ['esp-02'], tardias: 1 },
  { id: 'usr-enc-1', nombre: 'Marcelo Pérez', email: 'marcelo@villaguay.gob.ar', telefono: '3455-400100', rol: 'encargado', fav: [], tardias: 0 },
  { id: 'usr-adm-1', nombre: 'Nahuel Ojeda', email: 'nahuel@villaguay.gob.ar', telefono: '3455-400200', rol: 'administrador', fav: [], tardias: 0 },
];

const archivo = (nombre: string) => fileURLToPath(new URL(`../sql/${nombre}`, import.meta.url));

async function semilla() {
  await sql.file(archivo('02-semilla.sql'));
  console.log('Semilla aplicada (deportes, espacios, fijas).');
}

async function cargarUsuarios() {
  const claveHash = await hashearClave(CLAVE_PRUEBA);
  for (const u of usuarios) {
    await sql`
      insert into usuarios (id, nombre, email, telefono, rol, "claveHash", "espaciosFavoritos", "cancelacionesTardias")
      values (${u.id}, ${u.nombre}, ${u.email}, ${u.telefono}, ${u.rol}, ${claveHash}, ${u.fav}, ${u.tardias})
      on conflict (id) do nothing
    `;
  }
  console.log(`Usuarios de prueba listos (clave ${CLAVE_PRUEBA}).`);
}

/** Los casos que el PRD pide tener a mano para probar: todos relativos a hoy. */
async function cargarDemo() {
  const ahora = new Date();
  const hoy = fechaISO(ahora);

  // Un día entero bloqueado por lluvia.
  await sql`
    insert into dias_bloqueados ("espacioId", fecha, motivo)
    values ('esp-02', ${sumarDias(hoy, 1)}, 'Lluvia. La cancha 2 quedó impracticable.')
    on conflict do nothing
  `;

  // Una grilla completa sin un solo turno libre, y un turno suelto en mantenimiento.
  const bloqueos = HORAS.map(({ inicio }) => ({
    espacioId: 'esp-02',
    fecha: sumarDias(hoy, 3),
    inicio,
    motivo: inicio === '15:00' ? 'Pintura de líneas' : 'Cancha reservada para torneo interno',
  }));
  bloqueos.push({ espacioId: 'esp-02', fecha: hoy, inicio: '20:00', motivo: 'Césped anegado' });
  await sql`insert into turnos_bloqueados ${sql(bloqueos)} on conflict do nothing`;

  // Una reserva cumplida y una cancelada, para que "ya pasaron" no salga vacío.
  const pasada = sumarDias(hoy, -8);
  const pasada2 = sumarDias(hoy, -11);
  const historial = [
    {
      id: 'res-hist-1', turnoId: idTurno('esp-02', pasada, '20:00'), espacioId: 'esp-02', usuarioId: 'usr-207',
      cantidadPersonas: 10, codigoQr: 'VGY-HIST1', estado: 'cumplida', ingresoEn: `${pasada}T20:05:00-03:00`,
      creadaEn: `${sumarDias(pasada, -3)}T21:00:00-03:00`, cancelableHasta: cancelableHastaIso(pasada, '20:00'),
    },
    {
      id: 'res-hist-2', turnoId: idTurno('esp-02', pasada2, '21:00'), espacioId: 'esp-02', usuarioId: 'usr-207',
      cantidadPersonas: 10, codigoQr: 'VGY-HIST2', estado: 'cancelada', ingresoEn: null,
      creadaEn: `${sumarDias(pasada2, -2)}T18:00:00-03:00`, cancelableHasta: cancelableHastaIso(pasada2, '21:00'),
    },
  ];
  await sql`insert into reservas ${sql(historial)} on conflict do nothing`;

  // Una reserva para hoy, lista para escanear en la puerta.
  const hora = Number(horaISO(ahora).slice(0, 2));
  const fecha = hora >= 22 ? sumarDias(hoy, 1) : hoy;
  const inicio = `${String(hora >= 22 ? 10 : Math.max(hora + 1, 10)).padStart(2, '0')}:00`;
  await sql`
    insert into reservas ${sql({
      id: 'res-demo-hoy', turnoId: idTurno('esp-02', fecha, inicio), espacioId: 'esp-02', usuarioId: 'usr-207',
      cantidadPersonas: 10, codigoQr: 'VGY-DEMO-PUERTA', estado: 'confirmada', ingresoEn: null,
      creadaEn: isoConZona(ahora), cancelableHasta: cancelableHastaIso(fecha, inicio),
    })}
    on conflict do nothing
  `;
  console.log(`Demo cargada. Reserva para escanear: VGY-DEMO-PUERTA (cancha 2, ${fecha} ${inicio}).`);
}

try {
  await semilla();
  await cargarUsuarios();
  if (process.argv.includes('--demo')) await cargarDemo();
} finally {
  await sql.end();
}
