import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card, Empty, SectionTitle, StepDots, STAGE_COLOR } from '@/components/cards';
import { Body, Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { greetingId, timeAgoId } from '@/lib/format';
import { useHome } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

export default function Beranda() {
  const { profile } = useSession();
  const home = useHome();
  const first = profile?.account.name?.split(' ')[0] ?? 'Warga';
  const d = home.data;

  return (
    <Screen onRefresh={() => void home.refetch()} refreshing={home.isRefetching}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{profile?.village.name}</Text>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }} accessibilityRole="header">
            {greetingId(new Date().getHours())}, {first}
          </Text>
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

          <View style={{ marginTop: spacing.md, flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button label="Buat Surat" onPress={() => router.push('/layanan')} /></View>
            <View style={{ flex: 1 }}><Button label="Lapor Masalah" variant="secondary" onPress={() => router.push('/lapor/baru')} /></View>
          </View>

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
        </>
      ) : null}
      {profile?.account.type === 'staff' ? <Body muted>Fitur khusus perangkat desa menyusul.</Body> : null}
    </Screen>
  );
}
