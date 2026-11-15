import { BarlowCondensed_600SemiBold, useFonts as useBarlow } from '@expo-google-fonts/barlow-condensed';
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold, useFonts as useManrope } from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { BannerSinConexion } from '@/components/BannerSinConexion';
import { OyenteNotificaciones } from '@/components/OyenteNotificaciones';
import { PuertaBiometrica } from '@/components/PuertaBiometrica';
import { SplashInicio } from '@/components/SplashInicio';
import { FlujoProvider } from '@/contexto/flujo';
import { SesionProvider } from '@/contexto/sesion';
import { TemaProvider, useTema } from '@/contexto/tema';
import { migrar } from '@/persistencia/esquema';

SplashScreen.preventAutoHideAsync();

function Navegacion() {
  const { paleta, esquema } = useTema();
  const [intro, setIntro] = useState(true);
  const cerrarIntro = useCallback(() => setIntro(false), []);

  return (
    <View style={{ flex: 1, backgroundColor: paleta.fondo }}>
      <StatusBar style={esquema === 'oscuro' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: paleta.fondo },
          headerTintColor: paleta.texto,
          headerBackButtonDisplayMode: 'minimal',
          headerTitleStyle: { fontFamily: 'BarlowCondensed_600SemiBold' },
          contentStyle: { backgroundColor: paleta.fondo },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(gestion)" options={{ headerShown: false }} />
        <Stack.Screen name="ingresar" options={{ title: 'Entrar' }} />
        <Stack.Screen name="registrarse" options={{ title: 'Crear cuenta' }} />
        <Stack.Screen name="espacio" options={{ headerShown: false }} />
        <Stack.Screen name="mapa" options={{ title: 'Mapa' }} />
      </Stack>
      <BannerSinConexion />
      <PuertaBiometrica />
      {intro ? <SplashInicio onTerminar={cerrarIntro} /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [manrope] = useManrope({ Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold });
  const [barlow] = useBarlow({ BarlowCondensed_600SemiBold });
  const listo = manrope && barlow;

  if (!listo) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName="sportgo.db" onInit={migrar}>
        <TemaProvider>
          <SesionProvider>
            <FlujoProvider>
              <OyenteNotificaciones />
              <Navegacion />
            </FlujoProvider>
          </SesionProvider>
        </TemaProvider>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
