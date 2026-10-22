import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { registerPush } from '@/lib/push';
import { useSession } from '@/state/session';
import { colors } from '@/theme';

function openDeepLink(data: unknown) {
  const link = (data as { deepLink?: unknown } | null)?.deepLink;
  if (typeof link === 'string' && link.startsWith('/')) router.push(link as never);
}

export default function AppLayout() {
  const isStaff = useSession().profile?.account.type === 'staff';
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
      <Stack.Screen name="notifikasi" options={{ title: 'Notifikasi' }} />
      <Stack.Protected guard={!isStaff}>
        <Stack.Screen name="surat/baru" options={{ title: 'Buat surat' }} />
        <Stack.Screen name="surat/[id]" options={{ title: 'Status surat' }} />
        <Stack.Screen name="kabar/[id]" options={{ title: 'Kabar desa' }} />
        <Stack.Screen name="lapor/baru" options={{ title: 'Lapor masalah' }} />
        <Stack.Screen name="lapor/[id]" options={{ title: 'Status laporan' }} />
        <Stack.Screen name="keluarga" options={{ title: 'Keluarga saya' }} />
        <Stack.Screen name="hapus-akun" options={{ title: 'Hapus akun' }} />
      </Stack.Protected>
      <Stack.Protected guard={isStaff}>
        <Stack.Screen name="staff/surat/[id]" options={{ title: 'Permohonan surat' }} />
        <Stack.Screen name="staff/lapor/[id]" options={{ title: 'Laporan warga' }} />
        <Stack.Screen name="staff/pendaftaran" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
