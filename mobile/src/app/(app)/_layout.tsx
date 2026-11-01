import { router, Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { registerPush } from '@/lib/push';
import { useOutboxFlusher } from '@/lib/use-outbox';
import { useSession } from '@/state/session';
import { StackHeader } from '@/components/ui';
import { colors } from '@/theme';

function openDeepLink(data: unknown) {
  const link = (data as { deepLink?: unknown } | null)?.deepLink;
  if (typeof link === 'string' && link.startsWith('/')) router.push(link as never);
}

export default function AppLayout() {
  const profile = useSession().profile;
  const isStaff = profile?.account.type === 'staff';
  useOutboxFlusher(profile && !isStaff ? profile.account.id : undefined);
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
        header: ({ options, back, navigation }) => (
          <StackHeader title={typeof options.title === 'string' ? options.title : undefined} onBack={back && options.headerBackVisible !== false ? () => navigation.goBack() : undefined} />
        ),
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="notifikasi" options={{ title: 'Notifikasi' }} />
      <Stack.Screen name="iuran" options={{ title: 'Iuran & kas' }} />
      <Stack.Screen name="iuran/jadwal" options={{ title: 'Jadwal iuran' }} />
      <Stack.Screen name="iuran/kas" options={{ title: 'Buku kas' }} />
      <Stack.Screen name="bukti" options={{ title: 'Foto bukti' }} />
      <Stack.Screen name="info-desa" options={{ title: 'Info desa' }} />
      <Stack.Screen name="dana-desa" options={{ title: 'Dana desa' }} />
      <Stack.Screen name="warga/baru" options={{ title: 'Postingan baru' }} />
      <Stack.Screen name="warga/[id]" options={{ title: 'Postingan' }} />
      <Stack.Screen name="warga/profil/[id]" options={{ title: 'Profil' }} />
      <Stack.Screen name="warga/laporkan" options={{ title: 'Laporkan' }} />
      <Stack.Screen name="warga/minat" options={{ title: 'Minat saya' }} />
      <Stack.Protected guard={!isStaff}>
        <Stack.Screen name="surat/baru" options={{ title: 'Buat surat' }} />
        <Stack.Screen name="surat/[id]" options={{ title: 'Status surat' }} />
        <Stack.Screen name="kabar/[id]" options={{ title: 'Kabar desa' }} />
        <Stack.Screen name="lapor/baru" options={{ title: 'Lapor masalah' }} />
        <Stack.Screen name="lapor/[id]" options={{ title: 'Status laporan' }} />
        <Stack.Screen name="keluarga" options={{ title: 'Keluarga saya' }} />
        <Stack.Screen name="bantuan" options={{ title: 'Bantuan saya' }} />
        <Stack.Screen name="pusat-bantuan" options={{ title: 'Pusat bantuan' }} />
        <Stack.Screen name="koreksi" options={{ title: 'Koreksi data' }} />
        <Stack.Screen name="tagihan" options={{ title: 'Tagihan iuran' }} />
        <Stack.Screen name="ukm/index" options={{ title: 'Produk desa' }} />
        <Stack.Screen name="ukm/[id]" options={{ title: 'Produk' }} />
        <Stack.Screen name="ukm/form" options={{ title: 'Jual produk' }} />
        <Stack.Screen name="kas-rt" options={{ title: 'Kas RT' }} />
        <Stack.Screen name="rt/surat/[id]" options={{ title: 'Pengantar RT' }} />
        <Stack.Screen name="hapus-akun" options={{ title: 'Hapus akun' }} />
        <Stack.Screen name="warga/blokir" options={{ title: 'Akun diblokir' }} />
      </Stack.Protected>
      <Stack.Protected guard={isStaff}>
        <Stack.Screen name="staff/surat/[id]" options={{ title: 'Permohonan surat' }} />
        <Stack.Screen name="staff/lapor/[id]" options={{ title: 'Laporan warga' }} />
        <Stack.Screen name="staff/pendaftaran" options={{ headerShown: false }} />
        <Stack.Screen name="staff/scan-qr" options={{ title: 'Scan QR absensi' }} />
        <Stack.Screen name="staff/pengumuman/index" options={{ title: 'Pengumuman' }} />
        <Stack.Screen name="staff/pengumuman/baru" options={{ title: 'Pengumuman baru' }} />
        <Stack.Screen name="staff/warga/index" options={{ title: 'Cari warga' }} />
        <Stack.Screen name="staff/warga/[id]" options={{ title: 'Data warga' }} />
        <Stack.Screen name="staff/moderasi" options={{ title: 'Moderasi Warga' }} />
        <Stack.Screen name="staff/pengaturan-warga" options={{ title: 'Pengaturan Warga' }} />
        <Stack.Screen name="staff/rapor" options={{ title: 'Rapor layanan' }} />
        <Stack.Screen name="staff/rt-penugasan" options={{ title: 'Ketua RT' }} />
        <Stack.Screen name="staff/koreksi" options={{ title: 'Koreksi data warga' }} />
        <Stack.Screen name="staff/pengaturan-desa" options={{ title: 'Pengaturan Info Desa' }} />
      </Stack.Protected>
    </Stack>
  );
}
