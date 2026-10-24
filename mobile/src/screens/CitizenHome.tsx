import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { ActionTile, Card, Empty, MenuRow, SectionTitle, StepDots, STAGE_COLOR } from '@/components/cards';
import { Body, Button, ErrorBanner, HomeBand, Screen } from '@/components/ui';
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
      onRefresh={() => void home.refetch()}
      refreshing={home.isRefetching}
      header={<HomeBand eyebrow={profile?.village.name} greeting={`${greetingId(new Date().getHours())}, ${first}`} unread={d?.unreadNotifications ?? 0} onBell={() => router.push('/notifikasi')} />}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <ActionTile icon="document-text" label="Buat Surat" primary onPress={() => router.push('/layanan')} />
        <ActionTile icon="megaphone-outline" label="Lapor Masalah" onPress={() => router.push('/lapor/baru')} />
      </View>

      {waiting > 0 ? <Body muted>{waiting} kiriman menunggu sinyal. Akan dikirim otomatis.</Body> : null}
      {home.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
      {home.isError && !d ? (
        <View style={{ marginTop: spacing.md }}>
          <ErrorBanner message={home.error instanceof ApiError ? home.error.message : 'Gagal memuat. Tarik layar ke bawah untuk mencoba lagi.'} />
          <Button label="Coba lagi" variant="secondary" onPress={() => void home.refetch()} />
        </View>
      ) : null}

      {d ? (
        <>
          <SectionTitle>URUSAN SAYA</SectionTitle>
          {d.activeRequests.length === 0 ? (
            <Empty title="Belum ada urusan" hint="Butuh surat dari desa? Buat dari sini, tanpa antre." />
          ) : (
            d.activeRequests.map((r) => (
              <Card key={r.id} onPress={() => router.push(r.kind === 'report' ? `/lapor/${r.id}` : `/surat/${r.id}`)} label={`${r.type} untuk ${r.forName}. ${r.title}`}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{r.type}</Text>
                <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 8 }}>untuk {r.forName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <StepDots states={r.steps} />
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: STAGE_COLOR[r.stage] }}>{r.title}</Text>
                </View>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>{timeAgoId(r.updatedAt)}</Text>
              </Card>
            ))
          )}

          <SectionTitle>KABAR DESA</SectionTitle>
          {d.announcements.length === 0 ? (
            <Empty title="Belum ada kabar dari desa" />
          ) : (
            d.announcements.map((a) => (
              <Card key={a.id} onPress={() => router.push(`/kabar/${a.id}`)} label={a.title}>
                {a.pinned ? <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 2 }}>PENTING</Text> : null}
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{a.title}</Text>
                <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4 }} numberOfLines={3}>{a.excerpt}</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>{a.category} · {timeAgoId(a.publishedAt)}</Text>
              </Card>
            ))
          )}

          <SectionTitle>INFO DESA</SectionTitle>
          <MenuRow icon="information-circle-outline" title="Kantor, perangkat, dan nomor penting" onPress={() => router.push('/info-desa')} />
          <MenuRow icon="gift-outline" title="Bantuan saya" onPress={() => router.push('/bantuan')} />
        </>
      ) : null}
      {profile?.account.type === 'staff' ? <Body muted>Fitur khusus perangkat desa menyusul.</Body> : null}
    </Screen>
  );
}
