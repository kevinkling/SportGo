import Ionicons from '@expo/vector-icons/Ionicons';
import { useNetworkState } from 'expo-network';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '@/contexto/tema';

// Aviso fijo arriba cuando no hay red. La app sigue usable: reservas y QR viven en SQLite.
export function BannerSinConexion() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const { isConnected, isInternetReachable } = useNetworkState();

  // undefined = todavía no se sabe: se trata como con conexión para no parpadear al arrancar.
  const sinRed = isConnected === false || isInternetReachable === false;
  if (!sinRed) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[estilos.banner, { backgroundColor: paleta.mantenimiento, paddingTop: insets.top + 6 }]}>
      <Ionicons name="cloud-offline-outline" size={18} color={paleta.fondo} />
      <Text style={[estilos.texto, { color: paleta.fondo }]}>
        Sin conexión. Tus reservas y el QR siguen disponibles.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  texto: { flex: 1, fontFamily: 'Manrope_600SemiBold', fontSize: 13 },
});
