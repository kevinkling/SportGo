import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTema } from '@/contexto/tema';

export function RecorridoVideo({
  uri,
  portada,
  ancho,
}: {
  uri: string;
  portada?: string | null;
  ancho: number;
}) {
  const { paleta } = useTema();
  const [activo, setActivo] = useState(false);
  const medida = { width: ancho, height: 220 };

  if (activo) {
    return <Reproductor uri={uri} medida={medida} />;
  }

  return (
    <Pressable
      onPress={() => setActivo(true)}
      style={[estilos.caja, medida]}
      accessibilityRole="button"
      accessibilityLabel="Ver recorrido">
      {portada ? <Image source={{ uri: portada }} style={estilos.fondo} /> : null}
      <View style={estilos.velo} />
      <View style={[estilos.boton, { backgroundColor: paleta.cta }]}>
        <Text style={[estilos.botonTexto, { color: paleta.ctaTexto }]}>Ver Recorrido</Text>
      </View>
    </Pressable>
  );
}

function Reproductor({ uri, medida }: { uri: string; medida: { width: number; height: number } }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });

  return <VideoView player={player} style={medida} nativeControls contentFit="cover" />;
}

const estilos = StyleSheet.create({
  caja: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#070807',
  },
  fondo: { ...StyleSheet.absoluteFill },
  velo: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.38)' },
  boton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonTexto: { fontFamily: 'Manrope_700Bold', fontSize: 15 },
});
