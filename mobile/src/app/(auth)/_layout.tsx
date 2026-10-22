import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        headerBackTitle: 'Kembali',
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
