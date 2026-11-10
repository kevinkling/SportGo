import { Tabs } from 'expo-router';
import { Text } from 'react-native';

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
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>▦</Text>,
        }}
      />
      <Tabs.Screen
        name="turnos"
        options={{
          title: 'Turnos',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>▦</Text>,
        }}
      />
      <Tabs.Screen
        name="reservas"
        options={{
          title: 'Reservas',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>▣</Text>,
        }}
      />
    </Tabs>
  );
}
