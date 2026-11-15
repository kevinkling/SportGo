import Ionicons from '@react-native-vector-icons/ionicons';
import { Redirect, Tabs } from 'expo-router';

import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { puedeGestionar } from '@/servicios/sesion';

export default function GestionLayout() {
  const { paleta } = useTema();
  const { sesion, lista } = useSesion();

  if (!lista) return null;
  if (!sesion || !puedeGestionar(sesion.usuario.rol)) {
    return <Redirect href="/(tabs)/espacios" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: paleta.fondo,
          borderTopColor: paleta.linea,
          height: 62,
        },
        tabBarActiveTintColor: paleta.texto,
        tabBarInactiveTintColor: paleta.secundario,
        tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color }) => <Ionicons name="clipboard-outline" size={22} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="escanear"
        options={{
          title: 'QR',
          tabBarIcon: ({ color }) => <Ionicons name="qr-code-outline" size={22} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="bloqueos"
        options={{
          title: 'Bloqueos',
          tabBarIcon: ({ color }) => <Ionicons name="rainy-outline" size={22} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="fijas"
        options={{
          title: 'Fijas',
          tabBarIcon: ({ color }) => <Ionicons name="repeat-outline" size={22} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="precios"
        options={{
          title: 'Precios',
          tabBarIcon: ({ color }) => <Ionicons name="cash-outline" size={22} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
