import Ionicons from '@react-native-vector-icons/ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { useTema } from '@/contexto/tema';
import { complejoMasCercano, type ComplejoEnMapa } from '@/dominio/distancia';
import {
  abrirComoLlegar,
  leerPermisoUbicacion,
  pedirUbicacion,
  ubicacionSiPermitida,
  type PermisoUbicacion,
} from '@/servicios/ubicacion';
import type { Coordenadas } from '@/tipos';

type Props = {
  complejos: ComplejoEnMapa[];
  centrarEn?: Coordenadas;
  altura?: number;
};

function regionDe(puntos: Coordenadas[], foco?: Coordenadas): Region {
  if (foco) {
    return {
      latitude: foco.latitud,
      longitude: foco.longitud,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    };
  }
  if (puntos.length === 0) {
    return { latitude: -31.868, longitude: -59.023, latitudeDelta: 0.03, longitudeDelta: 0.03 };
  }
  const lats = puntos.map((p) => p.latitud);
  const lons = puntos.map((p) => p.longitud);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(0.02, (maxLat - minLat) * 2.4),
    longitudeDelta: Math.max(0.02, (maxLon - minLon) * 2.4),
  };
}

export function MapaComplejo({ complejos, centrarEn, altura }: Props) {
  const { paleta, esquema } = useTema();
  const mapaRef = useRef<MapView>(null);
  const [permiso, setPermiso] = useState<PermisoUbicacion>('undetermined');
  const [usuario, setUsuario] = useState<Coordenadas | null>(null);
  const estilos = crear(paleta, altura);

  const cercano = useMemo(
    () => (usuario ? complejoMasCercano(usuario, complejos) : null),
    [usuario, complejos],
  );

  useEffect(() => {
    let vivo = true;
    async function cargarPermiso() {
      const p = await leerPermisoUbicacion();
      if (!vivo) return;
      setPermiso(p);
      if (p !== 'granted') return;
      const coords = await ubicacionSiPermitida();
      if (vivo && coords) setUsuario(coords);
    }
    void cargarPermiso();
    return () => {
      vivo = false;
    };
  }, []);

  function ajustar() {
    if (centrarEn || complejos.length === 0) return;
    mapaRef.current?.fitToCoordinates(
      complejos.map((c) => ({ latitude: c.coordenadas.latitud, longitude: c.coordenadas.longitud })),
      { edgePadding: { top: 56, right: 48, bottom: 56, left: 48 }, animated: false },
    );
  }

  async function onUsarUbicacion() {
    const r = await pedirUbicacion();
    if (r.estado === 'concedida') {
      setPermiso('granted');
      setUsuario(r.coordenadas);
      return;
    }
    const actual = await leerPermisoUbicacion();
    setPermiso(actual === 'undetermined' ? 'denied' : actual);
    setUsuario(null);
  }

  return (
    <View style={estilos.wrap}>
      <MapView
        ref={mapaRef}
        style={estilos.mapa}
        initialRegion={regionDe(
          complejos.map((c) => c.coordenadas),
          centrarEn,
        )}
        showsUserLocation={permiso === 'granted'}
        showsMyLocationButton={permiso === 'granted'}
        userInterfaceStyle={esquema === 'oscuro' ? 'dark' : 'light'}
        onMapReady={ajustar}>
        {complejos.map((c) => {
          const esCercano = cercano?.nombre === c.nombre;
          return (
            <Marker
              key={c.nombre}
              coordinate={{ latitude: c.coordenadas.latitud, longitude: c.coordenadas.longitud }}
              title={c.nombre}
              description={esCercano ? 'Más cerca' : undefined}
              pinColor={esCercano ? '#1f7a3e' : undefined}
            />
          );
        })}
      </MapView>

      {permiso === 'undetermined' ? (
        <Pressable
          onPress={() => void onUsarUbicacion()}
          style={estilos.cta}
          accessibilityLabel="Usar mi ubicación">
          <Text style={estilos.ctaTexto}>Usar mi ubicación</Text>
        </Pressable>
      ) : null}

      {permiso === 'denied' ? (
        <Text style={estilos.aviso}>
          Sin ubicación no se marca el complejo más cercano. El mapa se ve igual.
        </Text>
      ) : null}

      {cercano ? (
        <Text style={estilos.aviso}>Más cerca: {cercano.nombre}</Text>
      ) : null}

      {complejos.map((c) => (
        <Pressable
          key={c.nombre}
          accessibilityRole="button"
          accessibilityLabel={`Cómo llegar a ${c.nombre}`}
          onPress={() => void abrirComoLlegar(c.nombre, c.coordenadas)}
          style={estilos.fila}>
          <View style={estilos.icono}>
            <Ionicons name="navigate-outline" size={20} color={paleta.ctaTexto} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.titulo}>Cómo llegar</Text>
            <Text style={estilos.sub} numberOfLines={1}>
              {c.nombre}
              {cercano?.nombre === c.nombre ? ' · Más cerca' : ''}
            </Text>
          </View>
          <Ionicons name="open-outline" size={20} color={paleta.secundario} />
        </Pressable>
      ))}
    </View>
  );
}

function crear(
  paleta: {
    fondo: string;
    texto: string;
    secundario: string;
    linea: string;
    cta: string;
    ctaTexto: string;
    superficie: string;
  },
  altura?: number,
) {
  return StyleSheet.create({
    wrap: { gap: 8 },
    mapa: {
      height: altura ?? 280,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: paleta.superficie,
    },
    cta: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: paleta.cta,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaTexto: { color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' },
    aviso: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13 },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: paleta.linea,
      backgroundColor: paleta.superficie,
    },
    icono: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: paleta.cta,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titulo: { fontSize: 15, fontFamily: 'Manrope_700Bold', color: paleta.texto },
    sub: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: paleta.secundario },
  });
}
