import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonSesion } from '@/components/BotonSesion';
import { peso } from '@/constants/tema';
import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { listarEspacios } from '@/servicios/espacios';
import { cambiarPrecio } from '@/servicios/gestion';
import { esError, type Espacio } from '@/tipos';

export default function PreciosScreen() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { sesion } = useSesion();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ id: string; ok: boolean; texto: string } | null>(null);

  const cargar = useCallback(async () => {
    const r = await listarEspacios(db);
    if (!esError(r)) {
      setEspacios(r.datos);
      setEdits(Object.fromEntries(r.datos.map((e) => [e.id, String(e.precioPorHora)])));
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const estilos = crear(paleta);

  async function onGuardar(id: string) {
    if (!sesion) return;
    Keyboard.dismiss();
    setGuardando(id);
    const n = Number(edits[id]?.replace(/\D/g, ''));
    const r = await cambiarPrecio(db, id, n, sesion.usuario.rol);
    setGuardando(null);
    if (esError(r)) {
      setResultado({ id, ok: false, texto: r.error.mensaje });
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResultado({ id, ok: true, texto: `Precio guardado: ${peso(r.datos.precio)} por hora` });
    void cargar();
  }

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }}>
      <View style={[estilos.cabeza, { paddingHorizontal: 16 }]}>
        <Text style={estilos.titulo}>Precios</Text>
        <BotonSesion />
      </View>
      <Text style={estilos.muted}>Pesos por hora. Se pagan en el lugar.</Text>
      {espacios.map((e) => (
        <View key={e.id} style={estilos.fila}>
          <Text style={estilos.nombre}>{e.nombre}</Text>
          <TextInput
            keyboardType="number-pad"
            value={edits[e.id] ?? ''}
            onChangeText={(t) => {
              setEdits((prev) => ({ ...prev, [e.id]: t }));
              if (resultado?.id === e.id) setResultado(null);
            }}
            style={estilos.input}
          />
          <Pressable
            disabled={guardando !== null}
            onPress={() => void onGuardar(e.id)}
            style={[estilos.guardar, guardando !== null && { opacity: 0.6 }]}>
            <Text style={{ color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' }}>
              {guardando === e.id ? 'Guardando…' : 'Guardar'}
            </Text>
          </Pressable>
          {resultado?.id === e.id ? (
            <Text
              style={{
                color: resultado.ok ? paleta.libreTexto : paleta.ocupado,
                fontFamily: 'Manrope_600SemiBold',
              }}>
              {resultado.ok ? '✓ ' : ''}
              {resultado.texto}
            </Text>
          ) : null}
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
    muted: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13, paddingHorizontal: 16, marginTop: 8 },
    fila: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: paleta.linea },
    nombre: { color: paleta.texto, fontFamily: 'Manrope_700Bold', fontSize: 16 },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: paleta.linea,
      borderRadius: 12,
      paddingHorizontal: 12,
      color: paleta.texto,
      fontFamily: 'Manrope_600SemiBold',
      backgroundColor: paleta.superficie,
    },
    guardar: {
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: paleta.cta,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
