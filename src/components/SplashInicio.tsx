import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';

import { colorDeporte } from '@/constants/tema';
import { useTema } from '@/contexto/tema';

const CESPED = colorDeporte['dep-futbol5'];

export function SplashInicio({ onTerminar }: { onTerminar: () => void }) {
  const { paleta } = useTema();
  const entrada = useSharedValue(0);
  const trazos = useSharedValue(0);
  const pelota = useSharedValue(0);
  const titulo = useSharedValue(0);
  const barra = useSharedValue(0);
  const salida = useSharedValue(1);
  const nativoOculto = useRef(false);

  useEffect(() => {
    let cancelado = false;
    const cerrar = () => {
      if (!cancelado) onTerminar();
    };
    const respaldo = setTimeout(cerrar, 2800);

    const animar = (reducir: boolean) => {
      if (cancelado) return;
      if (reducir) {
        entrada.value = 1;
        trazos.value = 1;
        pelota.value = 1;
        titulo.value = 1;
        barra.value = 1;
        salida.value = withDelay(
          420,
          withTiming(0, { duration: 180 }, (fin) => {
            if (fin) runOnJS(cerrar)();
          }),
        );
        return;
      }

      entrada.value = withSpring(1, { damping: 14, stiffness: 150 });
      trazos.value = withDelay(160, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
      pelota.value = withDelay(380, withSpring(1, { damping: 9, stiffness: 170 }));
      titulo.value = withDelay(460, withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }));
      barra.value = withDelay(720, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
      salida.value = withDelay(
        1480,
        withTiming(0, { duration: 360, easing: Easing.in(Easing.cubic) }, (fin) => {
          if (fin) runOnJS(cerrar)();
        }),
      );
    };

    animar(false);
    void AccessibilityInfo.isReduceMotionEnabled().then((reducir) => {
      if (reducir) animar(true);
    });

    return () => {
      cancelado = true;
      clearTimeout(respaldo);
    };
  }, [barra, entrada, onTerminar, pelota, salida, titulo, trazos]);

  function ocultarNativo() {
    if (nativoOculto.current) return;
    nativoOculto.current = true;
    SplashScreen.hideAsync().catch(() => undefined);
  }

  const estiloCapa = useAnimatedStyle(() => ({
    opacity: salida.value,
    transform: [{ scale: 1 + (1 - salida.value) * 0.035 }],
  }));
  const estiloHalo = useAnimatedStyle(() => ({
    opacity: entrada.value,
    transform: [{ scale: 0.88 + entrada.value * 0.12 }],
  }));
  const estiloMarca = useAnimatedStyle(() => ({
    opacity: entrada.value,
    transform: [{ scale: 0.82 + entrada.value * 0.18 }],
  }));
  const estiloTrazos = useAnimatedStyle(() => ({
    opacity: trazos.value,
    transform: [{ scale: 0.9 + trazos.value * 0.1 }],
  }));
  const estiloPelota = useAnimatedStyle(() => ({
    opacity: pelota.value,
    transform: [{ translateY: (1 - pelota.value) * -42 }, { scale: 0.55 + pelota.value * 0.45 }],
  }));
  const estiloTitulo = useAnimatedStyle(() => ({
    opacity: titulo.value,
    transform: [{ translateY: (1 - titulo.value) * 18 }],
  }));
  const estiloBarra = useAnimatedStyle(() => ({
    opacity: Math.min(1, barra.value * 1.4),
    transform: [{ scaleX: barra.value }],
  }));

  return (
    <Animated.View
      collapsable={false}
      onLayout={ocultarNativo}
      accessibilityLabel="SportGo"
      style={[estilos.capa, { backgroundColor: paleta.fondo }, estiloCapa]}>
      <Animated.View style={[estilos.anillo, { borderColor: paleta.linea }, estiloHalo]} />
      <Animated.View style={[estilos.halo, { backgroundColor: paleta.superficie }, estiloHalo]} />
      <View style={estilos.centro}>
        <Animated.View style={estiloMarca}>
          <Marca
            fondo={paleta.texto}
            linea={paleta.fondo}
            estiloTrazos={estiloTrazos}
            estiloPelota={estiloPelota}
          />
        </Animated.View>
        <Animated.View style={[estilos.bloque, estiloTitulo]}>
          <Text style={[estilos.nombre, { color: paleta.texto }]}>SportGo</Text>
          <Animated.View style={[estilos.barra, { backgroundColor: CESPED }, estiloBarra]} />
          <Text style={[estilos.bajada, { color: paleta.secundario }]}>Canchas y turnos</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function Marca({
  fondo,
  linea,
  estiloTrazos,
  estiloPelota,
}: {
  fondo: string;
  linea: string;
  estiloTrazos: AnimatedStyle<ViewStyle>;
  estiloPelota: AnimatedStyle<ViewStyle>;
}) {
  return (
    <View style={[estilos.marca, { backgroundColor: fondo }]}>
      <Animated.View style={[estilos.trazos, estiloTrazos]}>
        <View style={[estilos.cancha, { borderColor: linea }]} />
        <View style={[estilos.media, { backgroundColor: linea }]} />
        <View style={[estilos.circulo, { borderColor: linea }]} />
      </Animated.View>
      <Animated.View style={[estilos.pelota, { backgroundColor: CESPED }, estiloPelota]} />
    </View>
  );
}

const estilos = StyleSheet.create({
  capa: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anillo: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 230,
    borderWidth: 1,
  },
  halo: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  centro: {
    alignItems: 'center',
    marginTop: -28,
  },
  marca: {
    width: 132,
    height: 132,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trazos: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancha: {
    position: 'absolute',
    top: 18,
    left: 18,
    right: 18,
    bottom: 18,
    borderWidth: 3,
    borderRadius: 16,
  },
  media: {
    position: 'absolute',
    left: 18,
    right: 18,
    height: 3,
    top: 64.5,
  },
  circulo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
  },
  pelota: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  bloque: {
    alignItems: 'center',
    marginTop: 28,
  },
  nombre: {
    fontFamily: 'BarlowCondensed_600SemiBold',
    fontSize: 64,
    lineHeight: 66,
    letterSpacing: 0.4,
  },
  barra: {
    width: 72,
    height: 3,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 10,
  },
  bajada: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});
