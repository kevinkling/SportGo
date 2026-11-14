import Storage from 'expo-sqlite/kv-store';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { instanteTurno, tituloDia } from '@/dominio/fechas';
import { fechaDesdeTurnoId, horaDesdeTurnoId } from '@/dominio/grilla';
import { calcularMomentoRecordatorio } from '@/dominio/recordatorio';
import { espacios } from '@/mocks/catalogo';
import { leerFavoritos } from '@/servicios/favoritos';
import type { Reserva } from '@/tipos';

export const CANAL_RECORDATORIOS = 'recordatorios';
export const CANAL_AVISOS = 'avisos';

const CLAVE_PREFS = 'sportgo.notif.prefs';
const PREFIJO_RECORDATORIO = 'recordatorio:';

export interface PreferenciasNotif {
  recordatorios: boolean;
  favoritos: boolean;
}

export type TipoNotificacion = 'recordatorio' | 'suspension' | 'favorito';

export interface DatosNotificacion {
  tipo: TipoNotificacion;
  reservaId?: string;
  espacioId?: string;
  fecha?: string;
}

export interface EventoDisponibilidad {
  espacioId: string;
  fecha: string;
  /** null = se liberó el día entero */
  inicio: string | null;
}

const PREFS_DEFECTO: PreferenciasNotif = { recordatorios: true, favoritos: true };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function idRecordatorio(reservaId: string) {
  return `${PREFIJO_RECORDATORIO}${reservaId}`;
}

function payloadNotif(data: DatosNotificacion): Record<string, string> {
  const out: Record<string, string> = { tipo: data.tipo };
  if (data.reservaId) out.reservaId = data.reservaId;
  if (data.espacioId) out.espacioId = data.espacioId;
  if (data.fecha) out.fecha = data.fecha;
  return out;
}

export async function leerPreferenciasNotif(): Promise<PreferenciasNotif> {
  try {
    const crudo = await Storage.getItem(CLAVE_PREFS);
    if (!crudo) return PREFS_DEFECTO;
    const parsed = JSON.parse(crudo) as Partial<PreferenciasNotif>;
    return {
      recordatorios: parsed.recordatorios ?? true,
      favoritos: parsed.favoritos ?? true,
    };
  } catch {
    return PREFS_DEFECTO;
  }
}

export async function guardarPreferenciasNotif(prefs: PreferenciasNotif): Promise<void> {
  await Storage.setItem(CLAVE_PREFS, JSON.stringify(prefs));
  if (!prefs.recordatorios) await cancelarTodosLosRecordatorios();
}

export async function estadoPermisoNotificaciones(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'denied';
  }
}

export async function configurarNotificaciones() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL_RECORDATORIOS, {
        name: 'Recordatorios de turno',
        importance: Notifications.AndroidImportance.HIGH,
      });
      await Notifications.setNotificationChannelAsync(CANAL_AVISOS, {
        name: 'Avisos de turnos',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  } catch {
    // Web o entorno sin notificaciones nativas.
  }
}

export async function asegurarPermiso(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') return false;
    await configurarNotificaciones();
    const actual = await Notifications.getPermissionsAsync();
    if (actual.status === 'granted') return true;
    if (actual.status === 'denied') return false;
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.status === 'granted';
  } catch {
    return false;
  }
}

async function mostrarInmediata(entrada: {
  canal: string;
  titulo: string;
  mensaje: string;
  data: DatosNotificacion;
}) {
  const ok = await asegurarPermiso();
  if (!ok) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: entrada.titulo,
        body: entrada.mensaje,
        sound: false,
        data: payloadNotif(entrada.data),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: entrada.canal,
      },
    });
  } catch {
    // Sin permiso o en web no bloqueamos el flujo.
  }
}

export async function programarRecordatorio(entrada: {
  reservaId: string;
  espacioNombre: string;
  fecha: string;
  inicio: string;
}) {
  const prefs = await leerPreferenciasNotif();
  if (!prefs.recordatorios) return;
  const momento = calcularMomentoRecordatorio(entrada.fecha, entrada.inicio);
  if (!momento) return;
  const ok = await asegurarPermiso();
  if (!ok) return;
  try {
    const identifier = idRecordatorio(entrada.reservaId);
    await Notifications.cancelScheduledNotificationAsync(identifier);
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'Tu turno es en 2 horas',
        body: `${entrada.espacioNombre} · ${tituloDia(entrada.fecha)} a las ${entrada.inicio}. Mostrá el QR en la puerta.`,
        sound: false,
        data: payloadNotif({ tipo: 'recordatorio', reservaId: entrada.reservaId }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: momento,
        channelId: CANAL_RECORDATORIOS,
      },
    });
  } catch {
    // En web o sin soporte de alarmas no bloqueamos la reserva.
  }
}

export async function cancelarRecordatorio(reservaId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(idRecordatorio(reservaId));
  } catch {
    // Nada que cancelar.
  }
}

async function cancelarTodosLosRecordatorios() {
  try {
    const pendientes = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      pendientes
        .filter((n) => n.identifier.startsWith(PREFIJO_RECORDATORIO))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    // Entorno sin notificaciones programadas.
  }
}

export async function reprogramarRecordatorios(reservas: Reserva[]) {
  const prefs = await leerPreferenciasNotif();
  if (!prefs.recordatorios) {
    await cancelarTodosLosRecordatorios();
    return;
  }
  for (const r of reservas) {
    if (r.estado !== 'confirmada') continue;
    const fecha = fechaDesdeTurnoId(r.turnoId);
    const inicio = horaDesdeTurnoId(r.turnoId);
    const espacio = espacios.find((e) => e.id === r.espacioId);
    if (!fecha || !inicio || !espacio) continue;
    await programarRecordatorio({
      reservaId: r.id,
      espacioNombre: espacio.nombre,
      fecha,
      inicio,
    });
  }
}

export async function avisarSuspensionReserva(entrada: {
  reservaId: string;
  espacioNombre: string;
  fecha: string;
  inicio: string;
  motivo: string;
}) {
  await cancelarRecordatorio(entrada.reservaId);
  await mostrarInmediata({
    canal: CANAL_AVISOS,
    titulo: 'Turno suspendido',
    mensaje: `${entrada.espacioNombre}, ${tituloDia(entrada.fecha)} ${entrada.inicio}. ${entrada.motivo}`,
    data: { tipo: 'suspension', reservaId: entrada.reservaId },
  });
}

/** Punto de enganche: hoy dispara local; cuando haya API se cambia por push remoto. */
export async function emitirEventoDisponibilidad(evento: EventoDisponibilidad) {
  const prefs = await leerPreferenciasNotif();
  if (!prefs.favoritos) return;
  const favoritos = await leerFavoritos();
  if (!favoritos.includes(evento.espacioId)) return;
  if (evento.inicio) {
    const inicio = instanteTurno(evento.fecha, evento.inicio);
    if (inicio.getTime() <= Date.now()) return;
  }
  const espacio = espacios.find((e) => e.id === evento.espacioId);
  const nombre = espacio?.nombre ?? evento.espacioId;
  const mensaje = evento.inicio
    ? `Se liberó el turno de las ${evento.inicio} en ${nombre}.`
    : `Se liberó ${tituloDia(evento.fecha)} en ${nombre}.`;
  await mostrarInmediata({
    canal: CANAL_AVISOS,
    titulo: 'Turno libre',
    mensaje,
    data: { tipo: 'favorito', espacioId: evento.espacioId, fecha: evento.fecha },
  });
}

/** Conservado para llamadas viejas; preferí `avisarSuspensionReserva`. */
export async function avisarSuspension(titulo: string, mensaje: string) {
  await mostrarInmediata({
    canal: CANAL_AVISOS,
    titulo,
    mensaje,
    data: { tipo: 'suspension' },
  });
}

export function datosDeRespuesta(response: Notifications.NotificationResponse): DatosNotificacion | null {
  const crudo = response.notification.request.content.data;
  if (!crudo || typeof crudo !== 'object') return null;
  const tipo = (crudo as { tipo?: unknown }).tipo;
  if (tipo !== 'recordatorio' && tipo !== 'suspension' && tipo !== 'favorito') return null;
  return crudo as unknown as DatosNotificacion;
}
