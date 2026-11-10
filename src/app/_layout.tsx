import { BarlowCondensed_600SemiBold, useFonts as useBarlow } from '@expo-google-fonts/barlow-condensed';
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, useFonts as useManrope } from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { FlujoProvider } from '@/contexto/flujo';
import { SesionProvider } from '@/contexto/sesion';
import { TemaProvider, useTema } from '@/contexto/tema';
import { migrar } from '@/persistencia/esquema';

SplashScreen.preventAutoHideAsync();

function Navegacion() {
  const { paleta, esquema } = useTema();
  return (
    <>
      <StatusBar style={esquema === 'oscuro' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: paleta.fondo },
          headerTintColor: paleta.texto,
          headerTitleStyle: { fontFamily: 'BarlowCondensed_600SemiBold' },
          contentStyle: { backgroundColor: paleta.fondo },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ingresar" options={{ title: 'Entrar' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [manrope] = useManrope({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold });
  const [barlow] = useBarlow({ BarlowCondensed_600SemiBold });
  const listo = manrope && barlow;

  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);

  if (!listo) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName="sportgo.db" onInit={migrar}>
        <TemaProvider>
          <SesionProvider>
            <FlujoProvider>
              <Navegacion />
            </FlujoProvider>
          </SesionProvider>
        </TemaProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
