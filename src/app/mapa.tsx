import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapaComplejo } from '@/components/MapaComplejo';
import { useTema } from '@/contexto/tema';
import { complejosUnicos } from '@/dominio/distancia';
import { listarEspacios } from '@/servicios/espacios';
import { esError } from '@/tipos';

export default function MapaScreen() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const [carga, setCarga] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [complejos, setComplejos] = useState(complejosUnicos([]));
  const estilos = crear(paleta);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      setCarga(true);
      const r = await listarEspacios(db);
      if (!vivo) return;
      if (esError(r)) {
        setError(r.error.mensaje);
        setCarga(false);
        return;
      }
      setComplejos(complejosUnicos(r.datos));
      setCarga(false);
    }
    void cargar();
    return () => {
      vivo = false;
    };
  }, [db]);

  const mensajeVacio = useMemo(
    () => (complejos.length === 0 ? 'No hay complejos para mostrar.' : null),
    [complejos.length],
  );

  if (carga) {
    return (
      <View style={[estilos.pantalla, { paddingTop: 16 }]}>
        <ActivityIndicator color={paleta.texto} />
        <Text style={estilos.muted}>Cargando mapa…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[estilos.pantalla, { paddingTop: 16, paddingHorizontal: 16 }]}>
        <Text style={estilos.muted}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16), gap: 12 }}>
      <Text style={estilos.bajada}>
        Los espacios municipales están en dos complejos. La ubicación es opcional.
      </Text>
      {mensajeVacio ? (
        <Text style={estilos.muted}>{mensajeVacio}</Text>
      ) : (
        <MapaComplejo complejos={complejos} altura={360} />
      )}
    </ScrollView>
  );
}

function crear(paleta: { fondo: string; texto: string; secundario: string }) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: paleta.fondo },
    bajada: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13 },
    muted: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13 },
  });
}
