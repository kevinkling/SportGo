import * as Linking from 'expo-linking';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useTema } from '@/contexto/tema';
import {
  asegurarPermiso,
  estadoPermisoNotificaciones,
  guardarPreferenciasNotif,
  leerPreferenciasNotif,
  reprogramarRecordatorios,
  type PreferenciasNotif,
} from '@/servicios/notificaciones';
import type { Reserva } from '@/tipos';

interface Props {
  reservas: Reserva[];
}

export function PreferenciasAvisos({ reservas }: Props) {
  const { paleta } = useTema();
  const db = useSQLiteContext();
  const [prefs, setPrefs] = useState<PreferenciasNotif>({ recordatorios: true, favoritos: true });
  const [permiso, setPermiso] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [listo, setListo] = useState(false);
  const estilos = crear(paleta);

  useEffect(() => {
    void Promise.all([leerPreferenciasNotif(), estadoPermisoNotificaciones()]).then(([p, e]) => {
      setPrefs(p);
      setPermiso(e);
      setListo(true);
    });
  }, []);

  async function cambiar(clave: keyof PreferenciasNotif, valor: boolean) {
    if (valor) {
      const ok = await asegurarPermiso();
      setPermiso(ok ? 'granted' : await estadoPermisoNotificaciones());
      if (!ok) return;
    }
    const siguiente = { ...prefs, [clave]: valor };
    setPrefs(siguiente);
    await guardarPreferenciasNotif(siguiente);
    if (clave === 'recordatorios' && valor) {
      await reprogramarRecordatorios(db, reservas);
    }
  }

  if (!listo) return null;

  return (
    <View style={estilos.caja}>
      <Text style={estilos.titulo}>Avisos</Text>
      <Fila
        etiqueta="Recordatorio 2 horas antes"
        valor={prefs.recordatorios}
        onCambio={(v) => void cambiar('recordatorios', v)}
        paleta={paleta}
      />
      <Fila
        etiqueta="Cuando se libera un favorito"
        valor={prefs.favoritos}
        onCambio={(v) => void cambiar('favoritos', v)}
        paleta={paleta}
      />
      <Text style={estilos.nota}>Si la Dirección suspende un turno, el aviso llega igual.</Text>
      {permiso === 'denied' ? (
        <Pressable onPress={() => void Linking.openSettings()} style={estilos.ajustes} accessibilityRole="button">
          <Text style={estilos.ajustesTexto}>Activá las notificaciones en Ajustes</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Fila({
  etiqueta,
  valor,
  onCambio,
  paleta,
}: {
  etiqueta: string;
  valor: boolean;
  onCambio: (v: boolean) => void;
  paleta: ReturnType<typeof useTema>['paleta'];
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 12 }}>
      <Text style={{ flex: 1, color: paleta.texto, fontFamily: 'Manrope_600SemiBold', fontSize: 14 }}>{etiqueta}</Text>
      <Switch
        value={valor}
        onValueChange={onCambio}
        trackColor={{ false: paleta.linea, true: paleta.texto }}
        thumbColor={paleta.fondo}
        accessibilityLabel={etiqueta}
      />
    </View>
  );
}

function crear(paleta: ReturnType<typeof useTema>['paleta']) {
  return StyleSheet.create({
    caja: {
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 12,
      borderRadius: 14,
      backgroundColor: paleta.superficie,
      gap: 4,
    },
    titulo: { fontFamily: 'Manrope_700Bold', color: paleta.texto, fontSize: 16, marginBottom: 4 },
    nota: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 12, marginTop: 4 },
    ajustes: { minHeight: 44, justifyContent: 'center', marginTop: 8 },
    ajustesTexto: { fontFamily: 'Manrope_700Bold', color: paleta.texto, fontSize: 13 },
  });
}
