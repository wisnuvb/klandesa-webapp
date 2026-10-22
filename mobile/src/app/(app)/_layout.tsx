import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { registerPush } from '@/lib/push';
import { colors } from '@/theme';

function openDeepLink(data: unknown) {
  const link = (data as { deepLink?: unknown } | null)?.deepLink;
  if (typeof link === 'string' && link.startsWith('/')) router.push(link as never);
}

export default function AppLayout() {
  useEffect(() => {
    void registerPush({ ask: false }); // perbarui token bila izin sudah diberikan sebelumnya
    // Ketuk notifikasi saat app dibuka (latar/depan) maupun dari kondisi tertutup.
    const sub = Notifications.addNotificationResponseReceivedListener((r) => openDeepLink(r.notification.request.content.data));
    void Notifications.getLastNotificationResponseAsync().then((r) => r && openDeepLink(r.notification.request.content.data));
    return () => sub.remove();
  }, []);

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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="surat/baru" options={{ title: 'Buat surat' }} />
      <Stack.Screen name="surat/[id]" options={{ title: 'Status surat' }} />
      <Stack.Screen name="kabar/[id]" options={{ title: 'Kabar desa' }} />
      <Stack.Screen name="notifikasi" options={{ title: 'Notifikasi' }} />
      <Stack.Screen name="lapor/baru" options={{ title: 'Lapor masalah' }} />
      <Stack.Screen name="lapor/[id]" options={{ title: 'Status laporan' }} />
      <Stack.Screen name="keluarga" options={{ title: 'Keluarga saya' }} />
      <Stack.Screen name="hapus-akun" options={{ title: 'Hapus akun' }} />
    </Stack>
  );
}
