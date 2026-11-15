import Ionicons from '@react-native-vector-icons/ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { useMetodoBiometrico } from '@/hooks/useMetodoBiometrico';
import { confirmarIdentidad } from '@/servicios/biometria';
import { salir } from '@/servicios/sesion';

// Después de una huella buena, el diálogo del sistema también mueve el AppState:
// no se vuelve a bloquear por ese vaivén.
const GRACIA_MS = 3000;

/**
 * Reingreso: si hay una sesión guardada, tapa la app hasta que pase la huella, el
 * rostro o la clave del teléfono. Un teléfono sin ninguna de las tres no se bloquea.
 * Si falla o se cancela, queda "Reintentar" y "Salir de la cuenta".
 */
export function PuertaBiometrica() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { sesion, lista, bloqueada, setBloqueada, setSesion } = useSesion();
  const metodo = useMetodoBiometrico();
  const [rechazada, setRechazada] = useState(false);
  const verificando = useRef(false);
  const ultimoOk = useRef(0);

  const verificar = useCallback(async () => {
    if (verificando.current) return;
    verificando.current = true;
    const r = await confirmarIdentidad('Confirmá que sos vos para entrar a SportGo');
    verificando.current = false;
    if (r === 'rechazada') {
      setRechazada(true);
      return;
    }
    ultimoOk.current = Date.now();
    setRechazada(false);
    setBloqueada(false);
  }, [setBloqueada]);

  // El diálogo de huella es un sistema externo: se abre apenas la sesión queda bloqueada,
  // y el resultado llega de forma asíncrona.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lista && sesion && bloqueada) void verificar();
  }, [lista, sesion, bloqueada, verificar]);

  useEffect(() => {
    if (!sesion) return;
    let anterior = AppState.currentState;
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && anterior === 'background' && Date.now() - ultimoOk.current > GRACIA_MS) {
        setBloqueada(true);
      }
      anterior = estado;
    });
    return () => sub.remove();
  }, [sesion, setBloqueada]);

  async function onSalir() {
    await salir();
    setSesion(null);
    router.replace('/(tabs)/espacios');
  }

  if (!lista || !sesion || !bloqueada) return null;

  return (
    <View
      accessibilityViewIsModal
      style={[estilos.pantalla, { backgroundColor: paleta.fondo, paddingTop: insets.top + 24 }]}>
      <Ionicons name="finger-print-outline" size={72} color={paleta.texto} />
      <Text style={[estilos.titulo, { color: paleta.texto }]}>SportGo</Text>
      <Text style={[estilos.detalle, { color: paleta.secundario }]}>
        {rechazada
          ? 'No pudimos confirmar tu identidad.'
          : `Hola ${sesion.usuario.nombre.split(' ')[0]}. Confirmá con ${metodo} o la clave del teléfono.`}
      </Text>
      <Pressable
        onPress={() => void verificar()}
        accessibilityRole="button"
        style={[estilos.cta, { backgroundColor: paleta.cta }]}>
        <Text style={{ color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' }}>
          {rechazada ? 'Reintentar' : `Usar ${metodo}`}
        </Text>
      </Pressable>
      <Pressable onPress={() => void onSalir()} accessibilityRole="button" style={estilos.salir}>
        <Text style={{ color: paleta.secundario, fontFamily: 'Manrope_600SemiBold' }}>Salir de la cuenta</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  titulo: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 44 },
  detalle: { fontFamily: 'Manrope_400Regular', fontSize: 15, textAlign: 'center' },
  cta: { minHeight: 48, minWidth: 200, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  salir: { minHeight: 44, justifyContent: 'center' },
});
