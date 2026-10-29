import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/text';

import { Card, Chip, EmptyState, SectionHeader, ServiceTile, ShortcutTile, StepDots, STAGE_COLOR } from '@/components/cards';
import { Button, ErrorBanner, HomeBand, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { greetingId, timeAgoId } from '@/lib/format';
import { useHome } from '@/lib/queries';
import { useOutboxCount } from '@/lib/use-outbox';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

export function CitizenHome() {
  const { profile } = useSession();
  const home = useHome();
  const first = profile?.account.name?.split(' ')[0] ?? 'Warga';
  const d = home.data;
  const waiting = useOutboxCount(profile?.account.id);

  return (
    <Screen
      background={colors.canvas}
      onRefresh={() => void home.refetch()}
      refreshing={home.isRefetching}
      header={<HomeBand eyebrow={profile?.village.name} greeting={`${greetingId(new Date().getHours())}, ${first}`} unread={d?.unreadNotifications ?? 0} onBell={() => router.push('/notifikasi')} />}
    >
      {/* Dua tindakan paling sering: langsung terlihat, satu ketukan. */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <ServiceTile icon="document-text" label="Buat Surat" caption="Tanpa antre ke kantor desa" primary onPress={() => router.push('/layanan')} />
        <ServiceTile icon="megaphone-outline" label="Lapor Masalah" caption="Jalan rusak, lampu mati, dll." onPress={() => router.push('/lapor/baru')} />
      </View>

      {waiting > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.goldSoft, borderRadius: 14, padding: spacing.md, marginTop: spacing.md }}>
          <Ionicons name="cloud-upload-outline" size={22} color={colors.goldText} />
          <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: colors.goldText, fontWeight: '600' }}>{waiting} kiriman menunggu sinyal. Akan dikirim otomatis.</Text>
        </View>
      ) : null}
      {home.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
      {home.isError && !d ? (
        <View style={{ marginTop: spacing.md }}>
          <ErrorBanner message={home.error instanceof ApiError ? home.error.message : 'Gagal memuat. Tarik layar ke bawah untuk mencoba lagi.'} />
          <Button label="Coba lagi" variant="secondary" onPress={() => void home.refetch()} />
        </View>
      ) : null}

      {d ? (
        <>
          <SectionHeader>Urusan saya</SectionHeader>
          {d.activeRequests.length === 0 ? (
            <EmptyState icon="checkmark-done-outline" title="Belum ada urusan berjalan" hint="Butuh surat dari desa? Ketuk Buat Surat di atas." />
          ) : (
            d.activeRequests.map((r) => (
              <Card key={r.id} onPress={() => router.push(r.kind === 'report' ? `/lapor/${r.id}` : `/surat/${r.id}`)} label={`${r.type} untuk ${r.forName}. ${r.title}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{r.type}</Text>
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>untuk {r.forName}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
                <View style={{ height: 1, backgroundColor: colors.surface, marginVertical: 10 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <StepDots states={r.steps} />
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: STAGE_COLOR[r.stage] }}>{r.title}</Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>{timeAgoId(r.updatedAt)}</Text>
              </Card>
            ))
          )}

          <SectionHeader>Kabar desa</SectionHeader>
          {d.announcements.length === 0 ? (
            <EmptyState icon="newspaper-outline" title="Belum ada kabar dari desa" hint="Pengumuman resmi akan muncul di sini." />
          ) : (
            d.announcements.map((a) => (
              <Card key={a.id} onPress={() => router.push(`/kabar/${a.id}`)} label={a.title}>
                {a.imageUrl ? (
                  <Image source={{ uri: a.imageUrl }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12, marginBottom: spacing.sm, backgroundColor: colors.surface }} contentFit="cover" />
                ) : null}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                  {a.pinned ? <Chip label="PENTING" tone="gold" /> : null}
                  <Chip label={a.category} />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{a.title}</Text>
                <Text style={{ fontSize: 15, lineHeight: 21, color: colors.textMuted, marginTop: 4 }} numberOfLines={3}>{a.excerpt}</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 8 }}>{timeAgoId(a.publishedAt)}</Text>
              </Card>
            ))
          )}

          <SectionHeader>Lainnya</SectionHeader>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ShortcutTile icon="information-circle-outline" label="Info Desa" onPress={() => router.push('/info-desa')} />
            <ShortcutTile icon="gift-outline" label="Bantuan Saya" onPress={() => router.push('/bantuan')} />
            <ShortcutTile icon="people-outline" label="Keluarga" onPress={() => router.push('/keluarga')} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}
