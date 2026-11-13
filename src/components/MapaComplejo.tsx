import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTema } from '@/contexto/tema';
import type { Coordenadas } from '@/tipos';

async function abrirEnElSistema(nombre: string, coordenadas: Coordenadas) {
  const { latitud, longitud } = coordenadas;
  const etiqueta = encodeURIComponent(nombre);
  const nativo =
    Platform.OS === 'ios'
      ? `maps:0,0?q=${etiqueta}@${latitud},${longitud}`
      : `geo:${latitud},${longitud}?q=${latitud},${longitud}(${etiqueta})`;
  try {
    await Linking.openURL(nativo);
  } catch {
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`);
  }
}

export function MapaComplejo({ nombre, coordenadas }: { nombre: string; coordenadas: Coordenadas }) {
  const { paleta } = useTema();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver ubicación de ${nombre} en el mapa`}
      onPress={() => void abrirEnElSistema(nombre, coordenadas)}
      style={({ pressed }) => [
        estilos.tarjeta,
        { backgroundColor: paleta.superficie, borderColor: paleta.linea, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={[estilos.icono, { backgroundColor: paleta.cta }]}>
        <Ionicons name="location" size={22} color={paleta.ctaTexto} />
      </View>
      <View style={estilos.textos}>
        <Text style={[estilos.titulo, { color: paleta.texto }]}>Ver ubicación</Text>
        <Text style={[estilos.sub, { color: paleta.secundario }]} numberOfLines={1}>
          {nombre}
        </Text>
      </View>
      <Ionicons name="open-outline" size={20} color={paleta.secundario} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  icono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, gap: 2 },
  titulo: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  sub: { fontSize: 13, fontFamily: 'Manrope_400Regular' },
});
