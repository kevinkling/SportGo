import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { estiloBoton, estiloCampo, estiloError } from '@/constants/formulario';
import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { registrar } from '@/servicios/sesion';
import { esError } from '@/tipos';

const esquema = z.object({
  nombre: z.string().trim().min(2, 'Escribí tu nombre'),
  email: z
    .string()
    .trim()
    .min(1, 'Escribí el correo')
    .pipe(z.email('Ingresá un correo válido, por ejemplo nombre@mail.com')),
  telefono: z.string().trim().min(6, 'Dejá un teléfono de contacto'),
  clave: z.string().min(4, 'Mínimo 4 caracteres'),
});

type Valores = z.infer<typeof esquema>;
type Campo = keyof Valores;

const CAMPOS: { nombre: Campo; placeholder: string; teclado?: 'email-address' | 'phone-pad'; oculto?: boolean }[] = [
  { nombre: 'nombre', placeholder: 'Nombre y apellido' },
  { nombre: 'email', placeholder: 'Correo', teclado: 'email-address' },
  { nombre: 'telefono', placeholder: 'Teléfono', teclado: 'phone-pad' },
  { nombre: 'clave', placeholder: 'Clave', oculto: true },
];

export default function RegistrarseScreen() {
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
    defaultValues: { nombre: '', email: '', telefono: '', clave: '' },
  });

  const onSubmit = handleSubmit(async (valores) => {
    const r = await registrar(valores);
    if (esError(r)) {
      // El servidor rechaza, por ejemplo, un correo que ya tiene cuenta.
      setError(r.error.codigo === 'EMAIL_EN_USO' ? 'email' : 'clave', { message: r.error.mensaje });
      return;
    }
    setSesion(r.datos);
    router.dismissTo(destino === 'reservas' ? '/(tabs)/reservas' : '/(tabs)/espacios');
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: paleta.fondo }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        {CAMPOS.map((campo) => (
          <View key={campo.nombre} style={{ gap: 6 }}>
            <Controller
              control={control}
              name={campo.nombre}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  autoCapitalize={campo.nombre === 'nombre' ? 'words' : 'none'}
                  keyboardType={campo.teclado}
                  secureTextEntry={campo.oculto}
                  placeholder={campo.placeholder}
                  placeholderTextColor={paleta.secundario}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  style={estiloCampo(paleta)}
                />
              )}
            />
            {errors[campo.nombre] ? <Text style={estiloError(paleta)}>{errors[campo.nombre]?.message}</Text> : null}
          </View>
        ))}
        <Pressable disabled={isSubmitting} onPress={() => onSubmit()} style={estiloBoton(paleta)}>
          <Text style={{ color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' }}>
            {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
