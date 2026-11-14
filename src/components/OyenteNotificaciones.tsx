import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef } from 'react';

import { useFlujo } from '@/contexto/flujo';
import { useSesion } from '@/contexto/sesion';
import {
  configurarNotificaciones,
  datosDeRespuesta,
  reprogramarRecordatorios,
  type DatosNotificacion,
} from '@/servicios/notificaciones';
import { listarReservas } from '@/servicios/reservas';
import { esError } from '@/tipos';

export function OyenteNotificaciones() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { sesion } = useSesion();
  const { setEspacioId } = useFlujo();
  const vistas = useRef(new Set<string>());

  useEffect(() => {
    void configurarNotificaciones();
  }, []);

  useEffect(() => {
    if (!sesion) return;
    void listarReservas(db, sesion.usuario.id).then((r) => {
      if (!esError(r)) void reprogramarRecordatorios(r.datos);
    });
  }, [db, sesion]);

  useEffect(() => {
    function abrir(datos: DatosNotificacion) {
      if (datos.tipo === 'favorito' && datos.espacioId) {
        setEspacioId(datos.espacioId);
        router.navigate('/(tabs)/turnos');
        return;
      }
      router.navigate('/(tabs)/reservas');
    }

    function procesar(response: Notifications.NotificationResponse | null) {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (vistas.current.has(id)) return;
      vistas.current.add(id);
      const datos = datosDeRespuesta(response);
      if (datos) abrir(datos);
    }

    let sub: { remove: () => void } | undefined;
    try {
      void Notifications.getLastNotificationResponseAsync().then(procesar);
      sub = Notifications.addNotificationResponseReceivedListener(procesar);
    } catch {
      // Web o runtime sin notificaciones.
    }
    return () => sub?.remove();
  }, [router, setEspacioId]);

  return null;
}
