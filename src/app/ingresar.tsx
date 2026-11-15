import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { ingresar, puedeGestionar } from '@/servicios/sesion';
import { esError } from '@/tipos';

const esquema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Escribí el correo')
    .pipe(z.email('Ingresá un correo válido, por ejemplo nombre@mail.com')),
  clave: z.string().min(4, 'Mínimo 4 caracteres'),
});

type Valores = z.infer<typeof esquema>;

export default function IngresarScreen() {
  const { paleta } = useTema();
  const { setSesion } = useSesion();
  const router = useRouter();
  const { destino } = useLocalSearchParams<{ destino?: string }>();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: { email: '', clave: '' },
  });

  const onSubmit = handleSubmit(async (valores) => {
    const r = await ingresar(valores.email, valores.clave);
    if (esError(r)) {
      setError('clave', { message: r.error.mensaje });
      return;
    }
    setSesion(r.datos);
    if (puedeGestionar(r.datos.usuario.rol)) {
      router.replace('/(gestion)/agenda');
      return;
    }
    if (destino === 'reservas') {
      router.dismissTo('/(tabs)/reservas');
      return;
    }
    router.back();
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: paleta.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ padding: 16, gap: 12 }}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Correo"
              placeholderTextColor={paleta.secundario}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              style={input(paleta)}
            />
          )}
        />
        {errors.email ? <Text style={err(paleta)}>{errors.email.message}</Text> : null}
        <Controller
          control={control}
          name="clave"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              secureTextEntry
              placeholder="Clave"
              placeholderTextColor={paleta.secundario}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              style={input(paleta)}
            />
          )}
        />
        {errors.clave ? <Text style={err(paleta)}>{errors.clave.message}</Text> : null}
        <Pressable disabled={isSubmitting} onPress={() => onSubmit()} style={cta(paleta)}>
          <Text style={{ color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' }}>
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function input(paleta: ReturnType<typeof useTema>['paleta']) {
  return {
    minHeight: 48,
    borderWidth: 1,
    borderColor: paleta.linea,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: paleta.texto,
    fontFamily: 'Manrope_400Regular' as const,
    backgroundColor: paleta.superficie,
  };
}

function cta(paleta: ReturnType<typeof useTema>['paleta']) {
  return {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: paleta.cta,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
}

function err(paleta: ReturnType<typeof useTema>['paleta']) {
  return { color: paleta.ocupado, fontFamily: 'Manrope_400Regular' as const };
}
