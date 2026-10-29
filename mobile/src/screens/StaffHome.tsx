import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { MenuGroup, SectionHeader } from '@/components/cards';
import { Button, ErrorBanner, HomeBand, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { greetingId } from '@/lib/format';
import { useStaffSummary, type StaffSummary } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, shadow, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type Tab = 'surat' | 'laporan' | 'pendaftaran';

const goAntrean = (tab: Tab) => router.push({ pathname: '/antrean', params: { tab } });

/** Satu baris tugas: jumlah yang menunggu dibuat menonjol bila > 0, dan teduh (dengan centang) bila 0. */
function TaskRow({ icon, label, count, hint, hintDanger, first, onPress }: {
  icon: IconName; label: string; count: number; hint?: string; hintDanger?: boolean; first?: boolean; onPress: () => void;
}) {
  const open = count > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${open ? count : 'tidak ada'}${hint ? `. ${hint}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: first ? 0 : 1, borderTopColor: colors.surface }, pressed && { backgroundColor: colors.surface }]}
    >
      <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: open ? colors.goldSoft : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={22} color={open ? colors.goldText : colors.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: open ? '800' : '600', color: open ? colors.text : colors.textMuted }}>{label}</Text>
        {hint ? <Text style={{ fontSize: 14, fontWeight: '600', color: hintDanger ? colors.danger : colors.goldText, marginTop: 1 }}>{hint}</Text> : null}
      </View>
      {open ? (
        <View style={{ minWidth: 36, height: 36, borderRadius: 18, paddingHorizontal: 10, backgroundColor: colors.primaryDeep, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : (
        <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
      )}
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

/** Kartu ringkasan: kalimat pembuka yang menjawab "ada apa hari ini", lalu rincian per jenis tugas. */
function Summary({ d }: { d: StaffSummary }) {
  const { pendingMail, newReports, pendingSignups, processingReports } = d.counts;
  const total = (pendingMail ?? 0) + (newReports ?? 0) + (pendingSignups ?? 0);
  const days = d.oldestPendingMailHours != null ? Math.floor(d.oldestPendingMailHours / 24) : 0;
  const rows: { key: string; icon: IconName; label: string; count: number; tab: Tab; hint?: string; hintDanger?: boolean }[] = [];
  if (pendingMail !== null) rows.push({ key: 'mail', icon: 'document-text-outline', label: 'Surat menunggu', count: pendingMail, tab: 'surat', hint: pendingMail > 0 && days >= 1 ? `Tertua menunggu ${days} hari` : undefined, hintDanger: days >= 3 });
  if (newReports !== null) rows.push({ key: 'rep', icon: 'megaphone-outline', label: 'Laporan baru', count: newReports, tab: 'laporan' });
  if (pendingSignups !== null) rows.push({ key: 'sign', icon: 'person-add-outline', label: 'Pendaftaran warga', count: pendingSignups, tab: 'pendaftaran' });

  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 22, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: total > 0 ? colors.goldSoft : colors.primarySoft }}>
        <Ionicons name={total > 0 ? 'time' : 'checkmark-circle'} size={34} color={total > 0 ? colors.goldText : colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text }} accessibilityRole="header">
            {total > 0 ? `${total} hal menunggu Anda` : 'Semua beres'}
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 1 }}>
            {total > 0 ? 'Ketuk satu untuk mulai memeriksa.' : 'Tidak ada yang menunggu tindakan.'}
          </Text>
        </View>
      </View>
      {rows.map((r, i) => (
        <TaskRow key={r.key} icon={r.icon} label={r.label} count={r.count} hint={r.hint} hintDanger={r.hintDanger} first={i === 0} onPress={() => goAntrean(r.tab)} />
      ))}
      {processingReports ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${processingReports} laporan sedang ditangani`}
          onPress={() => goAntrean('laporan')}
          style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, backgroundColor: colors.surface }, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="construct-outline" size={20} color={colors.textMuted} />
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.textMuted }}>{processingReports} laporan sedang ditangani</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Aksi utama perangkat desa: satu tombol lebar yang jelas. */
function AnnounceCta() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buat pengumuman. Kabari seluruh warga desa."
      onPress={() => router.push('/staff/pengumuman')}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primary, borderRadius: 20, padding: spacing.md, marginTop: spacing.md, ...shadow.card }, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
    >
      <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="megaphone" size={26} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>Buat Pengumuman</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.88)', marginTop: 1 }}>Kabari seluruh warga desa</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#fff" />
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
          <Summary d={d} />
          <AnnounceCta />

          <SectionHeader>Kelola warga</SectionHeader>
          <MenuGroup
            items={[
              { icon: 'search-outline', title: 'Cari Warga', caption: 'Cari lewat nama atau NIK', onPress: () => router.push('/staff/warga') },
              { icon: 'create-outline', title: 'Koreksi Data Warga', caption: 'Periksa permintaan perbaikan data', onPress: () => router.push('/staff/koreksi') },
              { icon: 'shield-checkmark-outline', title: 'Moderasi Warga', caption: 'Tinjau kiriman di menu Warga', onPress: () => router.push('/staff/moderasi') },
              { icon: 'settings-outline', title: 'Pengaturan Warga', caption: 'Atur foto dan tulisan antarwarga', onPress: () => router.push('/staff/pengaturan-warga') },
            ]}
          />

          <SectionHeader>Kelola desa</SectionHeader>
          <MenuGroup
            items={[
              { icon: 'speedometer-outline', title: 'Rapor Layanan', caption: 'Seberapa cepat desa melayani warga', onPress: () => router.push('/staff/rapor') },
              { icon: 'ribbon-outline', title: 'Ketua RT', caption: 'Tunjuk warga sebagai Ketua RT', onPress: () => router.push('/staff/rt-penugasan') },
              { icon: 'information-circle-outline', title: 'Pengaturan Info Desa', caption: 'Apa yang warga lihat di Info Desa', onPress: () => router.push('/staff/pengaturan-desa') },
            ]}
          />
        </>
      ) : null}
    </Screen>
  );
}
