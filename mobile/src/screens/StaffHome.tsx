import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card, SectionTitle } from '@/components/cards';
import { Body, Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { greetingId } from '@/lib/format';
import { useStaffSummary } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

function Stat({ label, value, tone, onPress }: { label: string; value: number | null; tone?: 'warn'; onPress: () => void }) {
  if (value === null) return null; // peran tidak punya akses modul ini
  return (
    <Card onPress={onPress} label={`${label}: ${value}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Text style={{ fontSize: 34, fontWeight: '800', color: value > 0 && tone === 'warn' ? '#B26A00' : colors.text, minWidth: 48 }}>{value}</Text>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.text }}>{label}</Text>
        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
      </View>
    </Card>
  );
}

export function StaffHome() {
  const { profile } = useSession();
  const q = useStaffSummary();
  const d = q.data;
  const first = (d?.userName || profile?.account.name || '').split(' ')[0] || 'Pak/Bu';

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{profile?.village.name} · Perangkat desa</Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }} accessibilityRole="header">{greetingId(new Date().getHours())}, {first}</Text>
        </View>
        <Pressable onPress={() => router.push('/notifikasi')} accessibilityRole="button" accessibilityLabel={`Notifikasi, ${d?.unreadNotifications ?? 0} belum dibaca`} hitSlop={12} style={{ padding: 8 }}>
          <Ionicons name="notifications-outline" size={28} color={colors.text} />
          {d && d.unreadNotifications > 0 ? (
            <View style={{ position: 'absolute', top: 2, right: 2, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{d.unreadNotifications > 9 ? '9+' : d.unreadNotifications}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
      {q.isError && !d ? (
        <View style={{ marginTop: spacing.md }}>
          <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat. Tarik layar ke bawah untuk mencoba lagi.'} />
          <Button label="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
        </View>
      ) : null}

      {d ? (
        <>
          <SectionTitle>PERLU TINDAKAN</SectionTitle>
          <Stat label="Surat menunggu" value={d.counts.pendingMail} tone="warn" onPress={() => router.push({ pathname: '/antrean', params: { tab: 'surat' } })} />
          {d.oldestPendingMailHours != null && d.oldestPendingMailHours >= 24 ? (
            <Body muted>Surat tertua sudah menunggu {Math.floor(d.oldestPendingMailHours / 24)} hari.</Body>
          ) : null}
          <Stat label="Laporan baru" value={d.counts.newReports} tone="warn" onPress={() => router.push({ pathname: '/antrean', params: { tab: 'laporan' } })} />
          <Stat label="Pendaftaran warga menunggu" value={d.counts.pendingSignups} tone="warn" onPress={() => router.push({ pathname: '/antrean', params: { tab: 'pendaftaran' } })} />
          <SectionTitle>AKSI CEPAT</SectionTitle>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button label="Buat Pengumuman" variant="secondary" onPress={() => router.push('/staff/pengumuman')} /></View>
            <View style={{ flex: 1 }}><Button label="Cari Warga" variant="secondary" onPress={() => router.push('/staff/warga')} /></View>
          </View>
          <SectionTitle>SEDANG BERJALAN</SectionTitle>
          <Stat label="Laporan sedang ditangani" value={d.counts.processingReports} onPress={() => router.push({ pathname: '/antrean', params: { tab: 'laporan' } })} />
          {d.counts.pendingMail === 0 && d.counts.newReports === 0 && (d.counts.pendingSignups ?? 0) === 0 ? (
            <Body muted>Semua beres. Tidak ada yang menunggu tindakan Anda.</Body>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
