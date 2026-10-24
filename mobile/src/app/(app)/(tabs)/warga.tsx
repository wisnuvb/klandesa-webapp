import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Card, Empty } from '@/components/cards';
import { PostCard } from '@/components/post-card';
import { Body, Button, ErrorBanner, Field, Screen, Title, ALL_EDGES } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { useFeed, useSocialConfig, type FeedFilter } from '@/lib/queries';
import { colors, spacing } from '@/theme';

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
    <Screen edges={ALL_EDGES} footer={<Button label="Saya setuju, masuk ke Warga" loading={busy} onPress={accept} />}>
      <Title>Aturan komunitas</Title>
      <Body muted>Warga adalah ruang bersama warga desa Anda. Agar nyaman untuk semua:</Body>
      <ErrorBanner message={error} />
      {rules.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.primary }}>{i + 1}.</Text>
          <Text style={{ flex: 1, fontSize: 17, lineHeight: 25, color: colors.text }}>{r}</Text>
        </View>
      ))}
      <Body muted>Setiap postingan dan komentar bisa dilaporkan. Anda juga bisa memblokir akun yang mengganggu.</Body>
    </Screen>
  );
}

export default function Warga() {
  const cfg = useSocialConfig();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), 450); return () => clearTimeout(t); }, [text]);

  const enabled = cfg.isSuccess && cfg.data.termsAccepted;
  const feed = useFeed(filter, q, enabled);
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const official = feed.data?.pages[0]?.official ?? [];

  if (cfg.isLoading) return <Screen edges={ALL_EDGES}><ActivityIndicator color={colors.primary} /></Screen>;
  if (cfg.isError) {
    const reason = cfg.error instanceof ApiError ? (cfg.error.extra.reason as string | undefined) : undefined;
    return (
      <Screen edges={ALL_EDGES}>
        <Title>Warga</Title>
        {reason === 'SOCIAL_OFF' ? <Body>Fitur Warga belum diaktifkan di desa Anda. Tanyakan ke kantor desa.</Body> : (
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={items}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 96 }}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        onRefresh={() => void feed.refetch()}
        onEndReachedThreshold={0.6}
        onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage(); }}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Title>Warga</Title>
              <Pressable onPress={() => setSearching((s) => !s)} accessibilityRole="button" accessibilityLabel="Cari" hitSlop={10} style={{ padding: 8 }}>
                <Ionicons name={searching ? 'close' : 'search'} size={26} color={colors.text} />
              </Pressable>
            </View>
            {c.muted ? <ErrorBanner message="Akun Anda sedang dibisukan. Anda masih bisa membaca." /> : null}
            {searching ? <Field label="Cari kata atau #tag" value={text} onChangeText={setText} placeholder="mis. #gotongroyong" autoFocus /> : null}
            <FlatList
              horizontal showsHorizontalScrollIndicator={false} data={FILTERS} keyExtractor={(f) => f[0]} style={{ marginBottom: spacing.md }}
              renderItem={({ item: [k, label] }) => (
                <Pressable onPress={() => setFilter(k)} accessibilityRole="button" accessibilityState={{ selected: filter === k }}
                  style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, marginRight: 8, justifyContent: 'center', borderWidth: 1.5, borderColor: filter === k ? colors.primary : colors.border, backgroundColor: filter === k ? colors.primary : colors.bg }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: filter === k ? '#fff' : colors.text }}>{label}</Text>
                </Pressable>
              )}
            />
            {official.map((a) => (
              <Card key={a.id} onPress={() => router.push(`/kabar/${a.id}`)} label={`Kabar resmi desa: ${a.title}`}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>✓ KABAR RESMI DESA · {a.category.toUpperCase()}</Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{a.title}</Text>
                <Text style={{ fontSize: 15, color: colors.textMuted }} numberOfLines={2}>{a.excerpt}</Text>
              </Card>
            ))}
            {feed.isError ? <ErrorBanner message={feed.error instanceof ApiError ? feed.error.message : 'Gagal memuat Warga.'} /> : null}
          </View>
        }
        renderItem={({ item }) => <PostCard p={item} onTag={(t) => { setSearching(true); setText(t); }} />}
        ListEmptyComponent={feed.isLoading ? <ActivityIndicator color={colors.primary} /> : <Empty title={filter === 'saved' ? 'Belum ada postingan tersimpan' : 'Belum ada postingan'} hint="Jadilah yang pertama berbagi kegiatan di desa." />}
        ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : undefined}
      />
      {!c.muted ? (
        <Pressable onPress={() => router.push('/warga/baru')} accessibilityRole="button" accessibilityLabel="Buat postingan"
          style={{ position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 }}>
          <Ionicons name="add" size={34} color="#fff" />
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}
