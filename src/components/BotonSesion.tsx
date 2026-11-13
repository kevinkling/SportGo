import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { salir } from '@/servicios/sesion';

export function BotonSesion() {
  const { paleta } = useTema();
  const { sesion, setSesion } = useSesion();
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  async function onSalir() {
    await salir();
    setSesion(null);
    setAbierto(false);
  }

  function onIcono() {
    if (!sesion) {
      router.push('/ingresar');
      return;
    }
    setAbierto((v) => !v);
  }

  return (
    <View style={estilos.wrap}>
      <Pressable
        onPress={onIcono}
        accessibilityLabel={sesion ? `Cuenta de ${sesion.usuario.nombre}` : 'Entrar'}
        style={estilos.icono}>
        <Ionicons name="person-outline" size={22} color={paleta.texto} />
      </Pressable>
      {sesion && abierto ? (
        <View
          style={[
            estilos.panel,
            { backgroundColor: paleta.superficie, borderColor: paleta.linea },
          ]}>
          <Text style={[estilos.nombre, { color: paleta.texto }]} numberOfLines={1}>
            {sesion.usuario.nombre}
          </Text>
          <Pressable onPress={onSalir} accessibilityLabel="Salir" style={estilos.salir}>
            <Text style={{ color: paleta.secundario, fontFamily: 'Manrope_600SemiBold' }}>Salir</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  wrap: { zIndex: 20, width: 44, height: 44 },
  icono: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  panel: {
    position: 'absolute',
    top: 44,
    right: 0,
    minWidth: 180,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  nombre: { fontFamily: 'Manrope_700Bold', fontSize: 15 },
  salir: { minHeight: 44, justifyContent: 'center' },
});
