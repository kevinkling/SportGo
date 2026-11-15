import Ionicons from '@react-native-vector-icons/ionicons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface DatosResultado {
  ok: boolean;
  titulo: string;
  mensaje: string;
  filas: { etiqueta: string; valor: string }[];
}

// Colores fijos (no dependen del tema): verde y rojo se leen bien de noche y a la intemperie.
const VERDE = '#1b6e38';
const ROJO = '#a23a28';

/** Pantalla completa verde (entra) o roja (no entra), con el motivo y los datos de la reserva. */
export function ResultadoEscaneo({ datos, onOtro }: { datos: DatosResultado; onOtro: () => void }) {
  const insets = useSafeAreaInsets();
  const icono = useSharedValue(0);
  const contenido = useSharedValue(0);

  useEffect(() => {
    icono.value = withSpring(1, { damping: 9, stiffness: 140 });
    contenido.value = withDelay(180, withTiming(1, { duration: 320 }));
  }, [icono, contenido]);

  const iconoEstilo = useAnimatedStyle(() => ({
    opacity: icono.value,
    transform: [{ scale: 0.4 + icono.value * 0.6 }],
  }));
  const contenidoEstilo = useAnimatedStyle(() => ({
    opacity: contenido.value,
    transform: [{ translateY: (1 - contenido.value) * 16 }],
  }));

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[estilos.pantalla, { backgroundColor: datos.ok ? VERDE : ROJO, paddingTop: insets.top + 24 }]}>
      <Animated.View style={[estilos.circulo, iconoEstilo]}>
        <Ionicons name={datos.ok ? 'checkmark' : 'close'} size={84} color={datos.ok ? VERDE : ROJO} />
      </Animated.View>

      <Animated.View style={[estilos.cuerpo, contenidoEstilo]}>
        <Text style={estilos.titulo}>{datos.titulo}</Text>
        <Text style={estilos.mensaje}>{datos.mensaje}</Text>

        {datos.filas.length > 0 ? (
          <View style={estilos.tarjeta}>
            {datos.filas.map((fila, i) => (
              <View key={fila.etiqueta} style={[estilos.fila, i > 0 && estilos.filaBorde]}>
                <Text style={estilos.etiqueta}>{fila.etiqueta}</Text>
                <Text style={estilos.valor} numberOfLines={2}>
                  {fila.valor}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Animated.View>

      <Pressable onPress={onOtro} accessibilityRole="button" style={estilos.boton}>
        <Ionicons name="scan-outline" size={22} color="#101410" />
        <Text style={estilos.botonTexto}>Escanear otro</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingBottom: 24, gap: 20 },
  circulo: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  cuerpo: { alignSelf: 'stretch', alignItems: 'center', gap: 10, flex: 1 },
  titulo: { color: '#ffffff', fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 46, textAlign: 'center' },
  mensaje: { color: 'rgba(255,255,255,0.92)', fontFamily: 'Manrope_600SemiBold', fontSize: 16, textAlign: 'center' },
  tarjeta: {
    alignSelf: 'stretch',
    marginTop: 10,
    borderRadius: 18,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, minHeight: 50 },
  filaBorde: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.35)' },
  etiqueta: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Manrope_400Regular', fontSize: 14 },
  valor: { color: '#ffffff', fontFamily: 'Manrope_700Bold', fontSize: 15, flexShrink: 1, textAlign: 'right' },
  boton: {
    alignSelf: 'stretch',
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  botonTexto: { color: '#101410', fontFamily: 'Manrope_700Bold', fontSize: 17 },
});
