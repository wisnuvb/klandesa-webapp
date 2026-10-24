import { Stack } from 'expo-router';

import { StackHeader } from '@/components/ui';
import { colors } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        header: ({ options, back, navigation }) => (
          <StackHeader title={typeof options.title === 'string' ? options.title : undefined} onBack={back && options.headerBackVisible !== false ? () => navigation.goBack() : undefined} />
        ),
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Masuk' }} />
      <Stack.Screen name="lupa-password" options={{ title: 'Lupa password' }} />
      <Stack.Screen name="daftar/index" options={{ title: 'Pilih desa' }} />
      <Stack.Screen name="daftar/metode" options={{ title: 'Daftar' }} />
      <Stack.Screen name="daftar/form" options={{ title: 'Daftar' }} />
      <Stack.Screen name="daftar/menunggu" options={{ title: 'Menunggu persetujuan', headerBackVisible: false }} />
    </Stack>
  );
}
