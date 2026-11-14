import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonSesion } from '@/components/BotonSesion';
import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { fechaISO, nombreCortoDia, numeroDia, proximosSieteDias, tituloDia } from '@/dominio/fechas';
import { agendaDelDia, marcarAusente, type ItemAgenda } from '@/servicios/gestion';
import { esError } from '@/tipos';

export default function AgendaScreen() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { sesion } = useSesion();
  const hoy = fechaISO();
  const dias = proximosSieteDias(hoy);
  const [dia, setDia] = useState(hoy);
  const [items, setItems] = useState<ItemAgenda[]>([]);
  const [carga, setCarga] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCarga(true);
    const r = await agendaDelDia(db, dia);
    if (esError(r)) {
      setError(r.error.mensaje);
      setCarga(false);
      return;
    }
    setItems(r.datos);
    setError(null);
    setCarga(false);
  }, [db, dia]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const estilos = crear(paleta);

  async function onAusente(id: string) {
    if (!sesion) return;
    const r = await marcarAusente(db, id, sesion.usuario.rol);
    if (!esError(r)) void cargar();
  }

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }}>
      <View style={[estilos.cabeza, { paddingHorizontal: 16 }]}>
        <Text style={estilos.titulo}>Agenda</Text>
        <BotonSesion />
      </View>
      <Text style={estilos.muted}>{tituloDia(dia)}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.dias}>
        {dias.map((d) => (
          <Pressable key={d} onPress={() => setDia(d)} style={[estilos.dia, dia === d && estilos.diaOn]}>
            <Text style={{ color: dia === d ? paleta.fondo : paleta.secundario, fontFamily: 'Manrope_600SemiBold' }}>
              {nombreCortoDia(d)}
            </Text>
            <Text style={{ color: dia === d ? paleta.fondo : paleta.texto, fontFamily: 'Manrope_700Bold', fontSize: 18 }}>
              {numeroDia(d)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {carga ? <ActivityIndicator color={paleta.texto} style={{ marginTop: 24 }} /> : null}
      {error ? <Text style={estilos.muted}>{error}</Text> : null}
      {items.map((item) => (
        <View key={item.espacio.id} style={estilos.bloque}>
          <Text style={estilos.espacio}>{item.espacio.nombre}</Text>
          {item.bloqueado ? <Text style={{ color: paleta.lluvia, fontFamily: 'Manrope_600SemiBold' }}>{item.motivo}</Text> : null}
          {item.turnos
            .filter((t) => t.estado !== 'libre')
            .map((t) => (
              <View key={t.id} style={estilos.fila}>
                <Text style={estilos.hora}>{t.inicio}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: paleta.texto, fontFamily: 'Manrope_600SemiBold' }}>
                    {t.estado === 'fijo'
                      ? `Fijo · ${t.motivoBloqueo}`
                      : t.estado === 'mantenimiento'
                        ? `Bloqueado · ${t.motivoBloqueo}`
                        : t.reserva
                          ? `${t.reserva.cantidadPersonas} pers. · ${t.reserva.estado}`
                          : 'Reservado'}
                  </Text>
                  {t.reserva ? (
                    <Text style={{ color: paleta.secundario, fontFamily: 'Manrope_400Regular', fontSize: 12 }}>
                      {t.reserva.codigoQr}
                    </Text>
                  ) : null}
                </View>
                {t.reserva?.estado === 'confirmada' ? (
                  <Pressable onPress={() => onAusente(t.reserva!.id)} style={estilos.ausente}>
                    <Text style={{ color: paleta.ocupado, fontFamily: 'Manrope_700Bold' }}>Ausente</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
        </View>
      ))}
    </ScrollView>
  );
}

function crear(paleta: ReturnType<typeof useTema>['paleta']) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: paleta.fondo },
    cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
    titulo: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 42, color: paleta.texto, flex: 1 },
    muted: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13, paddingHorizontal: 16 },
    dias: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
    dia: {
      minWidth: 52,
      minHeight: 64,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: paleta.linea,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    diaOn: { backgroundColor: paleta.texto, borderColor: paleta.texto },
    bloque: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: paleta.linea, gap: 8 },
    espacio: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: paleta.texto },
    fila: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
    hora: { fontFamily: 'Manrope_700Bold', color: paleta.texto, width: 52 },
    ausente: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  });
}
