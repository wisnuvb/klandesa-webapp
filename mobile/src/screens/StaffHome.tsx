import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { ActionTile, Card, SectionTitle } from '@/components/cards';
import { Body, Button, ErrorBanner, HomeBand, Screen } from '@/components/ui';
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
    <Screen
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
      header={<HomeBand eyebrow={`${profile?.village.name} · Perangkat desa`} greeting={`${greetingId(new Date().getHours())}, ${first}`} unread={d?.unreadNotifications ?? 0} onBell={() => router.push('/notifikasi')} />}
    >
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
            <ActionTile icon="megaphone-outline" label="Buat Pengumuman" primary onPress={() => router.push('/staff/pengumuman')} />
            <ActionTile icon="search-outline" label="Cari Warga" onPress={() => router.push('/staff/warga')} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <ActionTile icon="shield-checkmark-outline" label="Moderasi Warga" onPress={() => router.push('/staff/moderasi')} />
            <ActionTile icon="settings-outline" label="Pengaturan Warga" onPress={() => router.push('/staff/pengaturan-warga')} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <ActionTile icon="information-circle-outline" label="Pengaturan Info Desa" onPress={() => router.push('/staff/pengaturan-desa')} />
            <ActionTile icon="create-outline" label="Koreksi Data Warga" onPress={() => router.push('/staff/koreksi')} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <ActionTile icon="ribbon-outline" label="Ketua RT" onPress={() => router.push('/staff/rt-penugasan')} />
            <View style={{ flex: 1 }} />
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
