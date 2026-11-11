import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colorDeporte, peso } from '@/constants/tema';
import { useFlujo } from '@/contexto/flujo';
import { useTema } from '@/contexto/tema';
import { listarDeportes, listarEspacios } from '@/servicios/espacios';
import { alternarFavorito, leerFavoritos } from '@/servicios/favoritos';
import { esError, type Deporte, type Espacio } from '@/tipos';

export default function EspaciosScreen() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setEspacioId } = useFlujo();
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [lista, setLista] = useState<Espacio[]>([]);
  const [carga, setCarga] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deporte, setDeporte] = useState('todos');
  const [complejo, setComplejo] = useState('todos');
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const cargar = useCallback(async () => {
    setCarga(true);
    setError(null);
    const [d, e, fav] = await Promise.all([listarDeportes(), listarEspacios(), leerFavoritos()]);
    if (esError(e)) {
      setError(e.error.mensaje);
      setCarga(false);
      return;
    }
    if (esError(d)) {
      setError(d.error.mensaje);
      setCarga(false);
      return;
    }
    setDeportes(d.datos);
    setLista(e.datos);
    setFavoritos(fav);
    setCarga(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const filtrados = useMemo(
    () =>
      lista.filter(
        (esp) =>
          (deporte === 'todos' || esp.deporteId === deporte) &&
          (complejo === 'todos' ||
            (complejo === 'poli' && esp.complejo === 'Polideportivo Municipal') ||
            (complejo === 'berduc' && esp.complejo === 'Parque Berduc')),
      ),
    [lista, deporte, complejo],
  );

  const estilos = crearEstilos(paleta);

  if (carga) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 8 }]}>
        <ActivityIndicator color={paleta.texto} />
        <Text style={estilos.muted}>Cargando espacios…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 8 }]}>
        <Text style={estilos.titulo}>Espacios</Text>
        <Text style={estilos.muted}>{error}</Text>
        <Pressable onPress={cargar} style={estilos.cta} accessibilityLabel="Reintentar">
          <Text style={estilos.ctaTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top + 8 }]}>
      <Text style={estilos.titulo}>Espacios</Text>
      <Text style={estilos.bajada}>Mirá sin cuenta. La cuenta hace falta recién para reservar.</Text>
      <View style={estilos.fila}>
        <Chip paleta={paleta} on={deporte === 'todos'} onPress={() => setDeporte('todos')} texto="Todos" />
        {deportes.map((d) => (
          <Chip key={d.id} paleta={paleta} on={deporte === d.id} onPress={() => setDeporte(d.id)} texto={d.nombre} />
        ))}
      </View>
      <View style={estilos.fila}>
        <Chip paleta={paleta} on={complejo === 'todos'} onPress={() => setComplejo('todos')} texto="Todos los complejos" />
        <Chip paleta={paleta} on={complejo === 'poli'} onPress={() => setComplejo('poli')} texto="Polideportivo" />
        <Chip paleta={paleta} on={complejo === 'berduc'} onPress={() => setComplejo('berduc')} texto="Parque Berduc" />
      </View>
      <Text style={estilos.muted}>
        {filtrados.length} {deporte === 'todos' && complejo === 'todos' ? 'espacios' : 'con este filtro'}
      </Text>
      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={estilos.muted}>Ningún espacio con ese filtro.</Text>}
        renderItem={({ item }) => {
          const deporteNombre = deportes.find((d) => d.id === item.deporteId)?.nombre ?? '';
          const fav = favoritos.includes(item.id);
          return (
            <View style={estilos.card}>
              <Pressable
                onPress={async () => {
                  const sig = await alternarFavorito(item.id);
                  setFavoritos(sig);
                }}
                style={estilos.estrella}
                accessibilityLabel={fav ? 'Sacar de favoritos' : 'Marcar como favorito'}>
                <Text style={{ color: fav ? '#f5c451' : paleta.texto, fontSize: 18 }}>{fav ? '★' : '☆'}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setEspacioId(item.id);
                  router.navigate('/(tabs)/turnos');
                }}
                style={{ paddingBottom: 8 }}>
                <View style={[estilos.banner, { backgroundColor: colorDeporte[item.deporteId] ?? '#31404d' }]} />
                <Text style={estilos.nombre}>{item.nombre}</Text>
                <Text style={estilos.muted}>
                  {deporteNombre} · {item.complejo === 'Polideportivo Municipal' ? 'Polideportivo' : 'Parque Berduc'}
                </Text>
                <View style={estilos.pills}>
                  <Pill paleta={paleta} texto={item.superficie} />
                  <Pill paleta={paleta} texto={item.iluminacion ? 'Luz' : 'Sin luz'} />
                  {item.techado ? <Pill paleta={paleta} texto="Cubierta" /> : null}
                  <Pill paleta={paleta} texto={item.videoUrl ? 'Recorrido 30 s' : 'Sin recorrido'} />
                </View>
                <Text style={estilos.precio}>
                  {peso(item.precioPorHora)} <Text style={estilos.muted}>/ hora</Text>
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

function Chip({
  texto,
  on,
  onPress,
  paleta,
}: {
  texto: string;
  on: boolean;
  onPress: () => void;
  paleta: { texto: string; fondo: string; linea: string };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: paleta.linea,
        justifyContent: 'center',
        backgroundColor: on ? paleta.texto : 'transparent',
      }}>
      <Text style={{ color: on ? paleta.fondo : paleta.texto, fontFamily: 'Manrope_400Regular' }}>{texto}</Text>
    </Pressable>
  );
}

function Pill({ texto, paleta }: { texto: string; paleta: { secundario: string; linea: string } }) {
  return (
    <Text
      style={{
        fontSize: 12,
        paddingVertical: 3,
        paddingHorizontal: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: paleta.linea,
        color: paleta.secundario,
        overflow: 'hidden',
      }}>
      {texto}
    </Text>
  );
}

function crearEstilos(paleta: { fondo: string; texto: string; secundario: string; linea: string; cta: string; ctaTexto: string; superficie: string }) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: paleta.fondo, paddingHorizontal: 16, gap: 8 },
    titulo: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 42, color: paleta.texto, lineHeight: 44 },
    bajada: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13 },
    muted: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13 },
    fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    cta: { minHeight: 48, borderRadius: 14, backgroundColor: paleta.cta, alignItems: 'center', justifyContent: 'center' },
    ctaTexto: { color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' },
    card: { marginBottom: 16, position: 'relative' },
    banner: { height: 96, borderRadius: 16 },
    nombre: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: paleta.texto, marginTop: 8 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    precio: { marginTop: 6, fontFamily: 'Manrope_700Bold', color: paleta.texto, fontSize: 16 },
    estrella: {
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 2,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.42)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
