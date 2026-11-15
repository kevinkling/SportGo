import Ionicons from '@react-native-vector-icons/ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MapaComplejo } from '@/components/MapaComplejo';
import { RecorridoVideo } from '@/components/RecorridoVideo';
import { peso } from '@/constants/tema';
import { useFlujo } from '@/contexto/flujo';
import { useTema } from '@/contexto/tema';
import { obtenerEspacio, listarDeportes } from '@/servicios/espacios';
import { fotosDeEspacio, videoDeEspacio } from '@/servicios/medios';
import { esError, type Deporte, type Espacio } from '@/tipos';

const ANCHO = Dimensions.get('window').width;

export default function FichaEspacio() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useSQLiteContext();
  const { setEspacioId } = useFlujo();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [deporte, setDeporte] = useState<Deporte | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [video, setVideo] = useState<string | null>(null);
  const [carga, setCarga] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      if (!id) {
        setError('Ese espacio no existe.');
        setCarga(false);
        return;
      }
      setCarga(true);
      const [esp, deps, rutas, vid] = await Promise.all([
        obtenerEspacio(db, id),
        listarDeportes(),
        fotosDeEspacio(db, id),
        videoDeEspacio(db, id),
      ]);
      if (!vivo) return;
      if (esError(esp)) {
        setError(esp.error.mensaje);
        setCarga(false);
        return;
      }
      setEspacio(esp.datos);
      if (!esError(deps)) {
        setDeporte(deps.datos.find((d) => d.id === esp.datos.deporteId) ?? null);
      }
      setFotos(rutas);
      setVideo(vid);
      setCarga(false);
    }
    void cargar();
    return () => {
      vivo = false;
    };
  }, [db, id]);

  const estilos = crear(paleta);

  if (carga) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 16 }]}>
        <ActivityIndicator color={paleta.texto} />
      </View>
    );
  }

  if (error || !espacio) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 8, paddingHorizontal: 16 }]}>
        <Text style={estilos.muted}>{error ?? 'Ese espacio no existe.'}</Text>
        <Pressable onPress={() => router.back()} style={estilos.cta}>
          <Text style={estilos.ctaTexto}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top }]}>
      <View style={estilos.cabeza}>
        <Pressable onPress={() => router.back()} style={estilos.icono} accessibilityLabel="Volver a espacios">
          <Ionicons name="chevron-back" size={24} color={paleta.texto} />
        </Pressable>
        <Text style={estilos.cabezaTitulo} numberOfLines={1}>
          Ficha
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {fotos.length > 0 || video ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {fotos.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: ANCHO, height: 220 }} resizeMode="cover" />
            ))}
            {video ? <RecorridoVideo uri={video} portada={fotos[0]} ancho={ANCHO} /> : null}
          </ScrollView>
        ) : (
          <View style={[estilos.sinFoto, { backgroundColor: paleta.superficie }]}>
            <Text style={estilos.muted}>Sin fotos</Text>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 6 }}>
          <Text style={estilos.nombre}>{espacio.nombre}</Text>
          <Text style={estilos.muted}>
            {deporte?.nombre ?? ''} · {espacio.complejo}
          </Text>
          <Text style={estilos.precio}>
            {peso(espacio.precioPorHora)} <Text style={estilos.muted}>/ hora</Text>
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
          <Text style={estilos.seccion}>Dónde queda</Text>
          <MapaComplejo
            complejos={[{ nombre: espacio.complejo, coordenadas: espacio.coordenadas }]}
            centrarEn={espacio.coordenadas}
            altura={220}
          />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
          <Text style={estilos.seccion}>Características</Text>
          <Text style={estilos.cuerpo}>Superficie: {espacio.superficie}</Text>
          <Text style={estilos.cuerpo}>{espacio.techado ? 'Cubierta' : 'Aire libre'}</Text>
          <Text style={estilos.cuerpo}>{espacio.iluminacion ? 'Con luz' : 'Sin luz'}</Text>
          <Text style={estilos.cuerpo}>Hasta {espacio.capacidad} personas</Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
          <Text style={estilos.seccion}>Reglas</Text>
          <Text style={estilos.cuerpo}>{espacio.reglas}</Text>
        </View>
      </ScrollView>

      <View style={[estilos.barra, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          onPress={() => {
            setEspacioId(espacio.id);
            router.push('/(tabs)/turnos');
          }}
          style={estilos.cta}
          accessibilityLabel="Ver turnos">
          <Text style={estilos.ctaTexto}>Ver turnos</Text>
        </Pressable>
      </View>
    </View>
  );
}

function crear(paleta: {
  fondo: string;
  texto: string;
  secundario: string;
  linea: string;
  cta: string;
  ctaTexto: string;
  superficie: string;
}) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: paleta.fondo },
    cabeza: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, minHeight: 48 },
    icono: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    cabezaTitulo: { flex: 1, fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 28, color: paleta.texto },
    muted: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13 },
    nombre: { fontFamily: 'Manrope_700Bold', fontSize: 22, color: paleta.texto },
    precio: { marginTop: 4, fontFamily: 'Manrope_700Bold', color: paleta.texto, fontSize: 18 },
    seccion: { fontFamily: 'Manrope_700Bold', color: paleta.texto, fontSize: 15 },
    cuerpo: { fontFamily: 'Manrope_400Regular', color: paleta.texto, fontSize: 15 },
    sinFoto: { height: 220, alignItems: 'center', justifyContent: 'center' },
    barra: { borderTopWidth: 1, borderTopColor: paleta.linea, padding: 12, backgroundColor: paleta.fondo },
    cta: { minHeight: 48, borderRadius: 14, backgroundColor: paleta.cta, alignItems: 'center', justifyContent: 'center' },
    ctaTexto: { color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' },
  });
}
