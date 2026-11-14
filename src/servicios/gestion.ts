import type { SQLiteDatabase } from 'expo-sqlite';

import { fechaISO, isoConZona } from '@/dominio/fechas';
import { expandirFranja, solapaFija, type FranjaFija } from '@/dominio/fijas';
import { armarGrilla, fechaDesdeTurnoId, horaDesdeTurnoId, HORAS, idTurno } from '@/dominio/grilla';
import { evaluarIngreso } from '@/dominio/ingreso';
import { espacios } from '@/mocks/catalogo';
import {
  insertarAviso,
  leerDiasBloqueados,
  leerFijas,
  leerPrecios,
  leerTurnosBloqueados,
} from '@/persistencia/gestion';
import { avisarSuspensionReserva, emitirEventoDisponibilidad } from '@/servicios/notificaciones';
import { esperar, fallo, ok } from '@/servicios/respuesta';
import type {
  DiaBloqueado,
  Espacio,
  Reserva,
  ReservaFija,
  Respuesta,
  Rol,
  Turno,
  TurnoBloqueado,
} from '@/tipos';

export interface ItemAgenda {
  espacio: Espacio;
  bloqueado: boolean;
  motivo: string | null;
  turnos: (Turno & { reserva: Reserva | null })[];
}

export interface ResultadoIngreso {
  reserva: Reserva;
  espacioNombre: string;
}

function exigeGestion(rol: Rol): Respuesta<never> | null {
  if (rol !== 'encargado' && rol !== 'administrador') {
    return fallo('PROHIBIDO', 'Esta acción es del encargado.');
  }
  return null;
}

async function suspenderReservas(
  db: SQLiteDatabase,
  afectadas: Reserva[],
  motivo: string,
  ahora: Date,
) {
  for (const r of afectadas) {
    await db.runAsync("UPDATE reservas SET estado = 'cancelada' WHERE id = ?", r.id);
    const fecha = fechaDesdeTurnoId(r.turnoId);
    const inicio = horaDesdeTurnoId(r.turnoId) ?? '';
    const espacio = espacios.find((e) => e.id === r.espacioId);
    const aviso = {
      id: `avi-${Date.now()}-${r.id}`,
      usuarioId: r.usuarioId,
      reservaId: r.id,
      mensaje: `Tu turno se suspendió: ${motivo}`,
      creadoEn: isoConZona(ahora),
    };
    await insertarAviso(db, aviso);
    await avisarSuspensionReserva({
      reservaId: r.id,
      espacioNombre: espacio?.nombre ?? r.espacioId,
      fecha: fecha ?? fechaISO(ahora),
      inicio: inicio || '—',
      motivo,
    });
  }
}

export async function validarIngreso(
  db: SQLiteDatabase,
  codigoQr: string,
  rol: Rol,
  espacioId?: string | null,
  ahora = new Date(),
): Promise<Respuesta<ResultadoIngreso>> {
  await esperar();
  const no = exigeGestion(rol);
  if (no) return no;
  const reserva = await db.getFirstAsync<Reserva>('SELECT * FROM reservas WHERE codigoQr = ?', codigoQr.trim());
  const evalr = evaluarIngreso(reserva ?? null, ahora, espacioId);
  if (!('ok' in evalr)) return fallo(evalr.codigo, evalr.mensaje);
  const ingresoEn = isoConZona(ahora);
  await db.runAsync("UPDATE reservas SET estado = 'cumplida', ingresoEn = ? WHERE id = ?", ingresoEn, reserva!.id);
  const espacio = espacios.find((e) => e.id === reserva!.espacioId);
  return ok({ reserva: { ...reserva!, estado: 'cumplida', ingresoEn }, espacioNombre: espacio?.nombre ?? reserva!.espacioId });
}

export async function marcarAusente(
  db: SQLiteDatabase,
  reservaId: string,
  rol: Rol,
): Promise<Respuesta<Reserva>> {
  await esperar();
  const no = exigeGestion(rol);
  if (no) return no;
  const reserva = await db.getFirstAsync<Reserva>('SELECT * FROM reservas WHERE id = ?', reservaId);
  if (!reserva) return fallo('NO_ENCONTRADO', 'No encontramos esa reserva.');
  if (reserva.estado !== 'confirmada') {
    return fallo('ESTADO', 'Solo se marca ausente una reserva confirmada.');
  }
  await db.runAsync("UPDATE reservas SET estado = 'ausente' WHERE id = ?", reservaId);
  await db.runAsync('UPDATE usuarios SET ausencias = ausencias + 1 WHERE id = ?', reserva.usuarioId);
  return ok({ ...reserva, estado: 'ausente' });
}

export async function agendaDelDia(db: SQLiteDatabase, fecha: string): Promise<Respuesta<ItemAgenda[]>> {
  await esperar();
  const [fijas, dias, turnosB, precios, reservas] = await Promise.all([
    leerFijas(db),
    leerDiasBloqueados(db),
    leerTurnosBloqueados(db),
    leerPrecios(db),
    db.getAllAsync<Reserva>("SELECT * FROM reservas WHERE estado IN ('confirmada', 'cumplida', 'ausente')"),
  ]);

  const items: ItemAgenda[] = espacios.map((espacio) => {
    const g = armarGrilla({
      espacioId: espacio.id,
      fecha,
      precio: precios[espacio.id] ?? espacio.precioPorHora,
      fijas,
      reservas: reservas.filter((r) => r.espacioId === espacio.id && r.estado === 'confirmada'),
      diasBloqueados: dias,
      turnosBloqueados: turnosB,
    });
    const turnos = (g.bloqueado
      ? HORAS.map(({ inicio, fin }) => ({
          id: idTurno(espacio.id, fecha, inicio),
          espacioId: espacio.id,
          fecha,
          inicio,
          fin,
          estado: 'mantenimiento' as const,
          reservaId: null,
          motivoBloqueo: g.motivo,
          precio: precios[espacio.id] ?? espacio.precioPorHora,
        }))
      : g.turnos
    ).map((t) => ({
      ...t,
      reserva: reservas.find((r) => r.turnoId === t.id && r.estado !== 'cancelada') ?? null,
    }));
    return {
      espacio: { ...espacio, precioPorHora: precios[espacio.id] ?? espacio.precioPorHora },
      bloqueado: g.bloqueado,
      motivo: g.motivo,
      turnos,
    };
  });

  return ok(items);
}

export async function bloquearDia(
  db: SQLiteDatabase,
  entrada: { espacioId: string; fecha: string; motivo: string; rol: Rol },
  ahora = new Date(),
): Promise<Respuesta<DiaBloqueado>> {
  await esperar();
  const no = exigeGestion(entrada.rol);
  if (no) return no;
  const motivo = entrada.motivo.trim();
  if (!motivo) return fallo('MOTIVO', 'Escribí el motivo del bloqueo.');
  await db.runAsync(
    'INSERT OR REPLACE INTO dias_bloqueados (espacioId, fecha, motivo, creadoEn) VALUES (?, ?, ?, ?)',
    entrada.espacioId,
    entrada.fecha,
    motivo,
    ahora.toISOString(),
  );
  const reservas = await db.getAllAsync<Reserva>(
    "SELECT * FROM reservas WHERE espacioId = ? AND estado = 'confirmada'",
    entrada.espacioId,
  );
  const afectadas = reservas.filter((r) => fechaDesdeTurnoId(r.turnoId) === entrada.fecha);
  await suspenderReservas(db, afectadas, motivo, ahora);
  return ok({ espacioId: entrada.espacioId, fecha: entrada.fecha, motivo });
}

export async function desbloquearDia(
  db: SQLiteDatabase,
  espacioId: string,
  fecha: string,
  rol: Rol,
): Promise<Respuesta<{ ok: true }>> {
  await esperar();
  const no = exigeGestion(rol);
  if (no) return no;
  await db.runAsync('DELETE FROM dias_bloqueados WHERE espacioId = ? AND fecha = ?', espacioId, fecha);
  await emitirEventoDisponibilidad({ espacioId, fecha, inicio: null });
  return ok({ ok: true });
}

/** Bloquea uno o varios turnos de un mismo día; avisa una sola vez a los jugadores afectados. */
export async function bloquearTurnos(
  db: SQLiteDatabase,
  entrada: { espacioId: string; fecha: string; inicios: string[]; motivo: string; rol: Rol },
  ahora = new Date(),
): Promise<Respuesta<TurnoBloqueado[]>> {
  await esperar();
  const no = exigeGestion(entrada.rol);
  if (no) return no;
  const motivo = entrada.motivo.trim();
  if (!motivo) return fallo('MOTIVO', 'Escribí el motivo del bloqueo.');
  if (entrada.inicios.length === 0) return fallo('TURNOS', 'Elegí al menos un turno.');

  const afectadas: Reserva[] = [];
  const bloqueados: TurnoBloqueado[] = [];
  for (const inicio of [...entrada.inicios].sort()) {
    await db.runAsync(
      'INSERT OR REPLACE INTO turnos_bloqueados (espacioId, fecha, inicio, motivo, creadoEn) VALUES (?, ?, ?, ?, ?)',
      entrada.espacioId,
      entrada.fecha,
      inicio,
      motivo,
      ahora.toISOString(),
    );
    const turnoId = idTurno(entrada.espacioId, entrada.fecha, inicio);
    afectadas.push(
      ...(await db.getAllAsync<Reserva>("SELECT * FROM reservas WHERE turnoId = ? AND estado = 'confirmada'", turnoId)),
    );
    bloqueados.push({ espacioId: entrada.espacioId, fecha: entrada.fecha, inicio, motivo });
  }
  await suspenderReservas(db, afectadas, motivo, ahora);
  return ok(bloqueados);
}

export async function desbloquearTurno(
  db: SQLiteDatabase,
  espacioId: string,
  fecha: string,
  inicio: string,
  rol: Rol,
): Promise<Respuesta<{ ok: true }>> {
  await esperar();
  const no = exigeGestion(rol);
  if (no) return no;
  await db.runAsync(
    'DELETE FROM turnos_bloqueados WHERE espacioId = ? AND fecha = ? AND inicio = ?',
    espacioId,
    fecha,
    inicio,
  );
  await emitirEventoDisponibilidad({ espacioId, fecha, inicio });
  return ok({ ok: true });
}

export interface BloqueoVigente {
  tipo: 'dia' | 'turno';
  espacioId: string;
  fecha: string;
  /** null cuando se bloquea el día entero */
  inicio: string | null;
  motivo: string;
  creadoEn: string;
}

/** Bloqueos de días y de turnos juntos, los últimos creados primero. */
export async function listarBloqueos(db: SQLiteDatabase): Promise<Respuesta<BloqueoVigente[]>> {
  await esperar();
  const [dias, turnos] = await Promise.all([
    db.getAllAsync<DiaBloqueado & { creadoEn: string }>(
      'SELECT espacioId, fecha, motivo, creadoEn FROM dias_bloqueados ORDER BY rowid DESC',
    ),
    db.getAllAsync<TurnoBloqueado & { creadoEn: string }>(
      'SELECT espacioId, fecha, inicio, motivo, creadoEn FROM turnos_bloqueados ORDER BY rowid DESC',
    ),
  ]);
  const todos: BloqueoVigente[] = [
    ...dias.map((d) => ({ tipo: 'dia' as const, ...d, inicio: null })),
    ...turnos.map((t) => ({ tipo: 'turno' as const, ...t })),
  ];
  // Orden estable: respeta rowid DESC cuando la fecha de creación empata.
  todos.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  return ok(todos);
}

export async function listarFijasServicio(db: SQLiteDatabase): Promise<Respuesta<ReservaFija[]>> {
  await esperar();
  return ok(await leerFijas(db));
}

export interface EntradaFijas {
  espacioId: string;
  titular: string;
  desde: string;
  /** null = sin fecha de fin */
  hasta: string | null;
  franjas: FranjaFija[];
  /** Ids de las fijas que se reemplazan al editar (vacío al crear). */
  reemplazaIds: string[];
}

/** Crea (o reemplaza al editar) las fijas de un titular: una por cada hora de cada franja. */
export async function guardarFijas(
  db: SQLiteDatabase,
  entrada: EntradaFijas,
  rol: Rol,
): Promise<Respuesta<ReservaFija[]>> {
  await esperar();
  const no = exigeGestion(rol);
  if (no) return no;
  const titular = entrada.titular.trim();
  if (!titular) return fallo('TITULAR', 'Indicá el titular de la fija.');
  if (entrada.hasta !== null && entrada.hasta < entrada.desde) {
    return fallo('FECHAS', 'La fecha de fin no puede ser anterior a la de inicio.');
  }
  if (entrada.franjas.length === 0) return fallo('FRANJAS', 'Agregá al menos un horario.');

  const nuevas: ReservaFija[] = [];
  const base = Date.now();
  for (const franja of entrada.franjas) {
    const horas = expandirFranja(franja);
    if (horas.length === 0) return fallo('FRANJAS', 'En cada horario, "hasta" tiene que ser después de "desde".');
    for (const h of horas) {
      nuevas.push({
        id: `fij-${base}-${nuevas.length}`,
        espacioId: entrada.espacioId,
        titular,
        dia: franja.dia,
        inicio: h.inicio,
        fin: h.fin,
        desde: entrada.desde,
        hasta: entrada.hasta,
        activa: true,
      });
    }
  }

  const claves = new Set<string>();
  for (const f of nuevas) {
    const clave = `${f.dia}-${f.inicio}`;
    if (claves.has(clave)) return fallo('SOLAPE', 'Dos de los horarios se pisan entre sí.');
    claves.add(clave);
  }

  const existentes = (await leerFijas(db)).filter((f) => !entrada.reemplazaIds.includes(f.id));
  if (nuevas.some((f) => solapaFija(existentes, f))) {
    return fallo('SOLAPE', 'Ya hay una fija en ese espacio, día y hora.');
  }

  for (const id of entrada.reemplazaIds) {
    await db.runAsync('DELETE FROM reservas_fijas WHERE id = ?', id);
  }
  for (const f of nuevas) {
    await db.runAsync(
      `INSERT INTO reservas_fijas (id, espacioId, titular, dia, inicio, fin, desde, hasta, activa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      f.id,
      f.espacioId,
      f.titular,
      f.dia,
      f.inicio,
      f.fin,
      f.desde,
      f.hasta,
    );
  }
  return ok(nuevas);
}

export async function desactivarFijas(
  db: SQLiteDatabase,
  ids: string[],
  rol: Rol,
): Promise<Respuesta<{ ok: true }>> {
  await esperar();
  const no = exigeGestion(rol);
  if (no) return no;
  for (const id of ids) {
    await db.runAsync('UPDATE reservas_fijas SET activa = 0 WHERE id = ?', id);
  }
  return ok({ ok: true });
}

export async function cambiarPrecio(
  db: SQLiteDatabase,
  espacioId: string,
  precio: number,
  rol: Rol,
): Promise<Respuesta<{ espacioId: string; precio: number }>> {
  await esperar();
  const no = exigeGestion(rol);
  if (no) return no;
  if (!Number.isFinite(precio) || precio < 0) return fallo('PRECIO', 'El precio tiene que ser un número.');
  const espacio = espacios.find((e) => e.id === espacioId);
  if (!espacio) return fallo('NO_ENCONTRADO', 'Ese espacio no existe.');
  await db.runAsync('INSERT OR REPLACE INTO precios_espacio (espacioId, precio) VALUES (?, ?)', espacioId, Math.round(precio));
  return ok({ espacioId, precio: Math.round(precio) });
}
