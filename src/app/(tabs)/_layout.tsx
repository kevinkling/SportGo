import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { useTema } from '@/contexto/tema';

export default function TabsLayout() {
  const { paleta } = useTema();
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
        tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
      }}>
      <Tabs.Screen
        name="espacios"
        options={{
          title: 'Espacios',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="turnos"
        options={{
          title: 'Turnos',
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="reservas"
        options={{
          title: 'Reservas',
          tabBarIcon: ({ color }) => <Ionicons name="ticket-outline" size={22} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
