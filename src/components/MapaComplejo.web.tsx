import Ionicons from '@react-native-vector-icons/ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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

export function MapaComplejo({ complejos }: Props) {
  const { paleta } = useTema();
  const [permiso, setPermiso] = useState<PermisoUbicacion>('undetermined');
  const [usuario, setUsuario] = useState<Coordenadas | null>(null);
  const estilos = crear(paleta);

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
      {permiso === 'undetermined' ? (
        <Pressable onPress={() => void onUsarUbicacion()} style={estilos.cta}>
          <Text style={estilos.ctaTexto}>Usar mi ubicación</Text>
        </Pressable>
      ) : null}
      {permiso === 'denied' ? (
        <Text style={estilos.aviso}>
          Sin ubicación no se marca el complejo más cercano. El mapa se ve igual.
        </Text>
      ) : null}
      {cercano ? <Text style={estilos.aviso}>Más cerca: {cercano.nombre}</Text> : null}
      {complejos.map((c) => (
        <Pressable
          key={c.nombre}
          accessibilityRole="link"
          accessibilityLabel={`Cómo llegar a ${c.nombre}`}
          onPress={() => void abrirComoLlegar(c.nombre, c.coordenadas)}
          style={estilos.fila}>
          <View style={estilos.icono}>
            <Ionicons name="navigate-outline" size={20} color={paleta.ctaTexto} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.titulo}>{c.nombre}</Text>
            <Text style={estilos.sub}>
              Cómo llegar
              {cercano?.nombre === c.nombre ? ' · Más cerca' : ''}
            </Text>
          </View>
          <Ionicons name="open-outline" size={20} color={paleta.secundario} />
        </Pressable>
      ))}
    </View>
  );
}

function crear(paleta: {
  texto: string;
  secundario: string;
  linea: string;
  cta: string;
  ctaTexto: string;
  superficie: string;
}) {
  return StyleSheet.create({
    wrap: { gap: 8 },
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
