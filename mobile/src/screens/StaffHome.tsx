import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/text';

import { SectionHeader, TileGrid } from '@/components/cards';
import { Button, ErrorBanner, HomeBand, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDayDateId, greetingId } from '@/lib/format';
import { useStaffSummary, type StaffSummary } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, shadow, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type Tab = 'surat' | 'laporan' | 'pendaftaran';

const goAntrean = (tab: Tab) => router.push({ pathname: '/antrean', params: { tab } });

/** Satu baris urusan: angka yang menunggu tampil di lencana hijau tua bertinta emas, atau centang teduh bila sudah beres. */
function TaskRow({ icon, label, note, count, noteDanger, first, onPress }: {
  icon: IconName; label: string; note: string; count: number; noteDanger?: boolean; first?: boolean; onPress: () => void;
}) {
  const open = count > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open ? `${label}: ${count}. ${note}` : `${label}: tidak ada yang menunggu`}
      onPress={onPress}
      style={({ pressed }) => [{ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: first ? 0 : 1, borderTopColor: colors.surface }, pressed && { backgroundColor: colors.surface }]}
    >
      <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: open ? colors.goldSoft : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={23} color={open ? colors.goldText : colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: open ? '800' : '600', color: open ? colors.text : colors.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 14, lineHeight: 19, fontWeight: noteDanger ? '700' : '500', color: noteDanger ? colors.danger : colors.textMuted, marginTop: 1 }}>
          {open ? note : 'Tidak ada yang menunggu'}
        </Text>
      </View>
      {open ? (
        <View style={{ minWidth: 38, height: 38, borderRadius: 19, paddingHorizontal: 10, backgroundColor: colors.primaryDeep, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.goldLight }}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : (
        <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
      )}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

/** "Hari ini": tanggal, satu kalimat hangat yang menjawab "ada apa", lalu rincian per jenis urusan. */
function Today({ d, first }: { d: StaffSummary; first: string }) {
  const { pendingMail, newReports, pendingSignups, processingReports } = d.counts;
  const total = (pendingMail ?? 0) + (newReports ?? 0) + (pendingSignups ?? 0);
  const days = d.oldestPendingMailHours != null ? Math.floor(d.oldestPendingMailHours / 24) : 0;
  const rows: { key: string; icon: IconName; label: string; note: string; count: number; tab: Tab; noteDanger?: boolean }[] = [];
  if (pendingMail !== null) {
    rows.push({
      key: 'mail', icon: 'document-text-outline', label: 'Surat warga', count: pendingMail, tab: 'surat', noteDanger: days >= 3,
      note: days >= 1 ? `Menunggu persetujuan · yang terlama ${days} hari` : 'Menunggu persetujuan Anda',
    });
  }
  if (newReports !== null) rows.push({ key: 'rep', icon: 'megaphone-outline', label: 'Laporan warga', count: newReports, tab: 'laporan', note: 'Baru masuk, belum dibaca' });
  if (pendingSignups !== null) rows.push({ key: 'sign', icon: 'person-add-outline', label: 'Warga baru mendaftar', count: pendingSignups, tab: 'pendaftaran', note: 'Menunggu dikenali dan disetujui' });

  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 24, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }}>
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md }}>
        <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: 0.2, color: colors.goldText }}>{formatDayDateId(new Date())}</Text>
        <Text style={{ fontSize: 24, lineHeight: 31, fontWeight: '800', letterSpacing: -0.3, color: colors.text, marginTop: 4 }} accessibilityRole="header">
          {total > 0 ? `Ada ${total} urusan menunggu Anda` : 'Semua urusan sudah beres'}
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 23, color: colors.textMuted, marginTop: 4 }}>
          {total > 0 ? 'Ketuk salah satu untuk mulai. Tidak perlu terburu-buru.' : `Terima kasih, ${first}. Tidak ada yang perlu Anda kerjakan sekarang.`}
        </Text>
      </View>
      <View style={{ height: 3, backgroundColor: colors.goldSoft }} />
      {rows.map((r, i) => (
        <TaskRow key={r.key} icon={r.icon} label={r.label} note={r.note} count={r.count} noteDanger={r.noteDanger} first={i === 0} onPress={() => goAntrean(r.tab)} />
      ))}
      {processingReports ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${processingReports} laporan sedang ditangani`}
          onPress={() => goAntrean('laporan')}
          style={({ pressed }) => [{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="construct-outline" size={20} color={colors.textMuted} />
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.textMuted }}>{processingReports} laporan sedang ditangani</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Aksi utama perangkat desa: satu kartu hijau tua bercincin emas, mudah dikenali sebagai tindakan terpenting. */
function AnnounceCta() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Tulis pengumuman. Sampaikan kabar kepada seluruh warga."
      onPress={() => router.push('/staff/pengumuman')}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primaryDeep, borderRadius: 22, padding: spacing.md, marginTop: spacing.md, ...shadow.card }, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
    >
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.goldSoft, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="megaphone" size={26} color={colors.goldText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>Tulis Pengumuman</Text>
        <Text style={{ fontSize: 14, lineHeight: 19, color: 'rgba(255,255,255,0.86)', marginTop: 1 }}>Sampaikan kabar kepada seluruh warga</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.goldLight} />
    </Pressable>
  );
}

export function StaffHome() {
  const { profile } = useSession();
  const q = useStaffSummary();
  const d = q.data;
  const first = (d?.userName || profile?.account.name || '').split(' ')[0] || 'Pak/Bu';

  return (
    <Screen
      background={colors.canvas}
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
      header={<HomeBand rounded eyebrow={profile?.village.name} greeting={`${greetingId(new Date().getHours())}, ${first}`} unread={d?.unreadNotifications ?? 0} onBell={() => router.push('/notifikasi')} />}
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
          <Today d={d} first={first} />
          <AnnounceCta />

          <SectionHeader>Bersama warga</SectionHeader>
          <TileGrid
            items={[
              { icon: 'search-outline', title: 'Cari warga', caption: 'Lewat nama atau NIK', onPress: () => router.push('/staff/warga') },
              { icon: 'create-outline', title: 'Perbaikan data', caption: 'Permintaan koreksi dari warga', onPress: () => router.push('/staff/koreksi') },
              { icon: 'shield-checkmark-outline', title: 'Tinjau kiriman', caption: 'Foto dan tulisan di menu Warga', onPress: () => router.push('/staff/moderasi') },
              { icon: 'options-outline', title: 'Atur ruang warga', caption: 'Izin foto dan tulisan antarwarga', onPress: () => router.push('/staff/pengaturan-warga') },
            ]}
          />

          <SectionHeader>Mengelola desa</SectionHeader>
          <TileGrid
            items={[
              { icon: 'speedometer-outline', title: 'Rapor layanan', caption: 'Seberapa cepat desa melayani', onPress: () => router.push('/staff/rapor') },
              { icon: 'ribbon-outline', title: 'Ketua RT', caption: 'Tunjuk warga sebagai Ketua RT', onPress: () => router.push('/staff/rt-penugasan') },
              { icon: 'information-circle-outline', title: 'Info desa', caption: 'Atur apa yang dilihat warga', onPress: () => router.push('/staff/pengaturan-desa') },
            ]}
          />
        </>
      ) : null}
    </Screen>
  );
}
