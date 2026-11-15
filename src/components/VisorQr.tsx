import Ionicons from '@react-native-vector-icons/ionicons';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const VELO = 'rgba(0,0,0,0.62)';
const ACENTO = '#7dffb0';
const GROSOR = 5;
const LARGO = 34;

interface Props {
  /** true mientras se valida un código: se frena la lectura y la animación. */
  pausado: boolean;
  onCodigo: (codigo: string) => void;
}

/**
 * Cámara a pantalla completa con un visor cuadrado al medio: lo de afuera se oscurece,
 * cuatro esquinas marcan dónde poner el QR y una línea lo recorre mientras espera.
 */
export function VisorQr({ pausado, onCodigo }: Props) {
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });
  const [linterna, setLinterna] = useState(false);
  const reducirMovimiento = useReducedMotion();
  const recorrido = useSharedValue(0);

  const lado = Math.round(Math.min(medida.ancho * 0.72, medida.alto * 0.5, 320));
  const arriba = Math.round(medida.alto * 0.42 - lado / 2);
  const izquierda = Math.round((medida.ancho - lado) / 2);

  useEffect(() => {
    if (pausado || reducirMovimiento) {
      cancelAnimation(recorrido);
      recorrido.value = 0.5;
      return;
    }
    recorrido.value = 0;
    recorrido.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(recorrido);
  }, [pausado, reducirMovimiento, recorrido]);

  const lineaEstilo = useAnimatedStyle(() => ({
    transform: [{ translateY: recorrido.value * Math.max(lado - 6, 0) }],
  }));

  function alMedir(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setMedida({ ancho: width, alto: height });
  }

  function alternarLinterna() {
    void Haptics.selectionAsync();
    setLinterna((v) => !v);
  }

  const listo = lado > 0;

  return (
    <View style={estilos.contenedor} onLayout={alMedir}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={linterna}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={pausado ? undefined : ({ data }) => onCodigo(data)}
      />

      {listo ? (
        <>
          {/* Velo oscuro alrededor del visor */}
          <View pointerEvents="none" style={[estilos.velo, { top: 0, left: 0, right: 0, height: arriba }]} />
          <View pointerEvents="none" style={[estilos.velo, { top: arriba + lado, left: 0, right: 0, bottom: 0 }]} />
          <View pointerEvents="none" style={[estilos.velo, { top: arriba, left: 0, width: izquierda, height: lado }]} />
          <View pointerEvents="none" style={[estilos.velo, { top: arriba, right: 0, width: izquierda, height: lado }]} />

          {/* Visor: esquinas, línea y estado */}
          <View pointerEvents="none" style={[estilos.visor, { top: arriba, left: izquierda, width: lado, height: lado }]}>
            <View style={[estilos.esquina, estilos.arribaIzq]} />
            <View style={[estilos.esquina, estilos.arribaDer]} />
            <View style={[estilos.esquina, estilos.abajoIzq]} />
            <View style={[estilos.esquina, estilos.abajoDer]} />
            {pausado ? (
              <View style={estilos.validando}>
                <ActivityIndicator color="#ffffff" size="large" />
                <Text style={estilos.validandoTexto}>Validando…</Text>
              </View>
            ) : (
              <Animated.View style={[estilos.linea, lineaEstilo]} />
            )}
          </View>

          <View pointerEvents="none" style={[estilos.pista, { top: arriba + lado + 20 }]}>
            <Ionicons name="qr-code-outline" size={18} color="#ffffff" />
            <Text style={estilos.pistaTexto}>Apuntá al QR de la reserva</Text>
          </View>
        </>
      ) : null}

      <Pressable
        onPress={alternarLinterna}
        accessibilityRole="button"
        accessibilityLabel={linterna ? 'Apagar linterna' : 'Encender linterna'}
        accessibilityState={{ selected: linterna }}
        hitSlop={8}
        style={[estilos.linterna, linterna && estilos.linternaOn]}>
        <Ionicons name={linterna ? 'flashlight' : 'flashlight-outline'} size={22} color={linterna ? '#101410' : '#ffffff'} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#000000', overflow: 'hidden' },
  velo: { position: 'absolute', backgroundColor: VELO },
  visor: { position: 'absolute' },
  esquina: { position: 'absolute', width: LARGO, height: LARGO, borderColor: ACENTO },
  arribaIzq: { top: 0, left: 0, borderTopWidth: GROSOR, borderLeftWidth: GROSOR, borderTopLeftRadius: 16 },
  arribaDer: { top: 0, right: 0, borderTopWidth: GROSOR, borderRightWidth: GROSOR, borderTopRightRadius: 16 },
  abajoIzq: { bottom: 0, left: 0, borderBottomWidth: GROSOR, borderLeftWidth: GROSOR, borderBottomLeftRadius: 16 },
  abajoDer: { bottom: 0, right: 0, borderBottomWidth: GROSOR, borderRightWidth: GROSOR, borderBottomRightRadius: 16 },
  linea: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: ACENTO,
    shadowColor: ACENTO,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  validando: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 16,
  },
  validandoTexto: { color: '#ffffff', fontFamily: 'Manrope_700Bold', fontSize: 15 },
  pista: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  pistaTexto: { color: '#ffffff', fontFamily: 'Manrope_600SemiBold', fontSize: 14 },
  linterna: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  linternaOn: { backgroundColor: ACENTO },
});
