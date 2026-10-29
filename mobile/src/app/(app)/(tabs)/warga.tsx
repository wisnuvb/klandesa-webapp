import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Card, Chip, EmptyState, InfoBox } from '@/components/cards';
import { PostCard } from '@/components/post-card';
import { PostSkeleton } from '@/components/skeleton';
import { BandButton, Button, ErrorBanner, Field, PageBand, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { useFeed, useSocialConfig, type FeedFilter } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, shadow, spacing } from '@/theme';

const FILTERS: [FeedFilter, string][] = [['all', 'Semua'], ['rt', 'RT saya'], ['kegiatan', 'Kegiatan'], ['usaha', 'Usaha'], ['foto', 'Foto'], ['saved', 'Disimpan']];

function Terms({ rules, onAccepted }: { rules: string[]; onAccepted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function accept() {
    setBusy(true);
    try { await post('/social/terms', {}); onAccepted(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Gagal menyimpan. Coba lagi.'); setBusy(false); }
  }
  return (
    <Screen background={colors.canvas} header={<PageBand title="Aturan komunitas" />} footer={<Button label="Saya setuju, masuk ke Warga" icon="checkmark" loading={busy} onPress={accept} />}>
      <Text style={{ fontSize: 17, lineHeight: 25, color: colors.text, marginBottom: spacing.md }}>Warga adalah ruang bersama warga desa Anda. Agar nyaman untuk semua:</Text>
      <ErrorBanner message={error} />
      <View style={{ gap: spacing.sm }}>
        {rules.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', backgroundColor: colors.bg, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadow.card }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryDeep, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>{i + 1}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 17, lineHeight: 25, color: colors.text }}>{r}</Text>
          </View>
        ))}
      </View>
      <View style={{ marginTop: spacing.md }}>
        <InfoBox>Setiap postingan dan komentar bisa dilaporkan. Anda juga bisa memblokir akun yang mengganggu.</InfoBox>
      </View>
    </Screen>
  );
}

/** Pil filter datar untuk deretan geser; tidak memakai centang agar muat banyak. */
function FilterPill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 22, marginRight: 8, justifyContent: 'center', borderWidth: 1.5, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : colors.bg }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: on ? '#fff' : colors.text }}>{label}</Text>
    </Pressable>
  );
}

export default function Warga() {
  const cfg = useSocialConfig();
  const qc = useQueryClient();
  const isStaff = useSession().profile?.account.type === 'staff';
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), 450); return () => clearTimeout(t); }, [text]);

  const enabled = cfg.isSuccess && cfg.data.termsAccepted;
  const feed = useFeed(filter, q, enabled);
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const official = feed.data?.pages[0]?.official ?? [];

  const band = (searchBtn?: boolean) => (
    <PageBand
      title="Warga"
      right={searchBtn ? <BandButton icon={searching ? 'close' : 'search'} label={searching ? 'Tutup pencarian' : 'Cari'} onPress={() => setSearching((s) => !s)} /> : undefined}
    />
  );

  if (cfg.isLoading) return <Screen background={colors.canvas} header={band()}><ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /></Screen>;
  if (cfg.isError) {
    const reason = cfg.error instanceof ApiError ? (cfg.error.extra.reason as string | undefined) : undefined;
    return (
      <Screen background={colors.canvas} header={band()}>
        {reason === 'SOCIAL_OFF' ? (
          <EmptyState icon="people-outline" title="Warga belum diaktifkan" hint={isStaff ? 'Aktifkan dulu dan pilih mode moderasi di Pengaturan Warga. Setelah itu halaman ini langsung tampil untuk semua warga.' : 'Fitur ini belum diaktifkan di desa Anda. Tanyakan ke kantor desa.'}>
            {isStaff ? <View style={{ alignSelf: 'stretch', marginTop: spacing.md }}><Button label="Buka Pengaturan Warga" icon="settings-outline" onPress={() => router.push('/staff/pengaturan-warga')} /></View> : null}
          </EmptyState>
        ) : (
          <>
            <ErrorBanner message={cfg.error instanceof ApiError ? cfg.error.message : 'Gagal memuat. Coba lagi.'} />
            <Button label="Coba lagi" variant="secondary" onPress={() => void cfg.refetch()} />
          </>
        )}
      </Screen>
    );
  }
  const c = cfg.data;
  if (!c) return null;
  if (!c.termsAccepted) return <Terms rules={c.rules} onAccepted={() => void qc.invalidateQueries({ queryKey: ['social-config'] })} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {band(true)}
      <FlatList
        data={items}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: 96 }}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        onRefresh={() => void feed.refetch()}
        onEndReachedThreshold={0.6}
        onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage(); }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: spacing.md }}>
            {c.muted ? <ErrorBanner message="Akun Anda sedang dibisukan. Anda masih bisa membaca." /> : null}
            {searching ? <Field label="Cari kata atau #tag" icon="search-outline" value={text} onChangeText={setText} placeholder="contoh: #gotongroyong" autoFocus /> : null}
            <FlatList
              horizontal showsHorizontalScrollIndicator={false} data={isStaff ? FILTERS.filter(([k]) => k !== 'rt') : FILTERS} keyExtractor={(f) => f[0]} style={{ marginBottom: spacing.md }}
              renderItem={({ item: [k, label] }) => <FilterPill label={label} on={filter === k} onPress={() => setFilter(k)} />}
            />
            {official.map((a) => (
              <Card key={a.id} onPress={() => router.push(`/kabar/${a.id}`)} label={`Kabar resmi desa: ${a.title}`}>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                  <Chip label="KABAR RESMI DESA" tone="gold" icon="shield-checkmark" />
                  <Chip label={a.category.toUpperCase()} />
                </View>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{a.title}</Text>
                <Text style={{ fontSize: 15, lineHeight: 21, color: colors.textMuted, marginTop: 2 }} numberOfLines={2}>{a.excerpt}</Text>
              </Card>
            ))}
            {feed.isError ? <ErrorBanner message={feed.error instanceof ApiError ? feed.error.message : 'Gagal memuat Warga.'} /> : null}
          </View>
        }
        renderItem={({ item }) => <PostCard p={item} onTag={(t) => { setSearching(true); setText(t); }} />}
        ListEmptyComponent={feed.isLoading ? <PostSkeleton /> : <View style={{ paddingHorizontal: spacing.md }}><EmptyState icon="chatbubbles-outline" title={filter === 'saved' ? 'Belum ada postingan tersimpan' : 'Belum ada postingan'} hint="Jadilah yang pertama berbagi kegiatan di desa." /></View>}
        ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : undefined}
      />
      {!c.muted ? (
        <Pressable onPress={() => router.push('/warga/baru')} accessibilityRole="button" accessibilityLabel="Tulis postingan baru"
          style={({ pressed }) => [{ position: 'absolute', right: 16, bottom: 16, minHeight: 56, paddingHorizontal: 22, borderRadius: 28, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow.card, elevation: 6 }, pressed && { opacity: 0.9 }]}>
          <Ionicons name="create" size={22} color="#fff" />
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff' }}>Tulis</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
