import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Text } from '@/components/text';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, Card, Chip, EmptyState, InfoBox } from '@/components/cards';
import { PostCard } from '@/components/post-card';
import { PostSkeleton } from '@/components/skeleton';
import { BandButton, Button, ErrorBanner, Field, PageBand, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { useFeed, useSocialConfig, type FeedFilter, type FeedSort } from '@/lib/queries';
import { setSignalsEnabled, useFeedTracking } from '@/lib/social-signals';
import { useSession } from '@/state/session';
import { colors, shadow, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Pintasan bulat bergaya "Stories" Instagram / "Status" WhatsApp: satu ketuk memilih topik, tanpa fitur baru yang perlu dimoderasi. */
const SHORTCUTS: [FeedFilter, string, IconName][] = [
  ['all', 'Semua', 'apps'], ['rt', 'RT saya', 'people'], ['kegiatan', 'Kegiatan', 'calendar'], ['usaha', 'Usaha', 'storefront'], ['foto', 'Foto', 'images'], ['saved', 'Disimpan', 'bookmark'],
];

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

function Shortcut({ label, icon, on, onPress }: { label: string; icon: IconName; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} style={({ pressed }) => [{ width: 72, alignItems: 'center', gap: 6, marginRight: 8 }, pressed && { opacity: 0.8 }]}>
      <View style={{ width: 62, height: 62, borderRadius: 31, borderWidth: 2.5, borderColor: on ? colors.gold : colors.border, padding: 3, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.primaryDeep : colors.primarySoft }}>
          <Ionicons name={icon} size={24} color={on ? colors.goldLight : colors.primary} />
        </View>
      </View>
      <Text style={{ fontSize: 13.5, fontWeight: on ? '800' : '600', color: on ? colors.text : colors.textMuted }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

/** Tab ala TikTok: "Untuk Anda" (dipilihkan) dan "Terbaru" (urut waktu). Tombol "Atur" membuka pengaturan minat. */
function FeedTabs({ sort, onSort, onTune }: { sort: FeedSort; onSort: (s: FeedSort) => void; onTune: () => void }) {
  const tab = (k: FeedSort, label: string) => {
    const on = sort === k;
    return (
      <Pressable key={k} onPress={() => onSort(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ minHeight: 48, paddingHorizontal: 6, marginRight: 22, justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: on ? colors.primary : 'transparent' }}>
        <Text style={{ fontSize: 17, fontWeight: on ? '800' : '600', color: on ? colors.text : colors.textMuted }}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, paddingLeft: spacing.md, paddingRight: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', flex: 1 }}>{tab('foryou', 'Untuk Anda')}{tab('latest', 'Terbaru')}</View>
      <Pressable onPress={onTune} accessibilityRole="button" accessibilityLabel="Atur minat saya" hitSlop={4} style={({ pressed }) => [{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.6 }]}>
        <Ionicons name="options-outline" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

/** Kotak "Apa kabar hari ini?" ala Facebook: jalan masuk menulis yang paling dikenal, dengan pintasan foto. */
function Composer({ name, onPress }: { name: string; onPress: () => void }) {
  const first = name.split(' ')[0] || 'Anda';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Tulis postingan baru" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.bg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: 8 }, pressed && { opacity: 0.85 }]}>
      <Avatar name={name} size={42} />
      <View style={{ flex: 1, minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 16, justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, color: colors.textMuted }} numberOfLines={1}>Apa kabar hari ini, {first}?</Text>
      </View>
      <Ionicons name="images" size={28} color={colors.primary} />
    </Pressable>
  );
}

export default function Warga() {
  const cfg = useSocialConfig();
  const qc = useQueryClient();
  const isStaff = useSession().profile?.account.type === 'staff';
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [tab, setTab] = useState<FeedSort>('foryou');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), 450); return () => clearTimeout(t); }, [text]);

  const enabled = cfg.isSuccess && cfg.data.termsAccepted;
  // "Untuk Anda" hanya bila desa/akun ini memenuhi syarat (server menentukan); selain itu urut waktu seperti biasa.
  const sort: FeedSort = cfg.data?.feed.forYou ? tab : 'latest';
  const feed = useFeed(filter, q, sort, enabled);
  // Cursor peringkat bisa membuat satu postingan muncul di dua halaman bila data berubah di tengah gulir: saring berdasarkan id.
  const items = [...new Map((feed.data?.pages.flatMap((p) => p.items) ?? []).map((p) => [p.id, p])).values()];
  const src = feed.data?.pages[0]?.ranked ? 'forYou' : 'latest';
  const tracking = useFeedTracking(src);
  useEffect(() => { if (cfg.data) setSignalsEnabled(cfg.data.feed.learn); }, [cfg.data]);
  const official = feed.data?.pages[0]?.official ?? [];

  const band = (full?: boolean) => (
    <PageBand
      title="Warga"
      right={full ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <BandButton icon={searching ? 'close' : 'search'} label={searching ? 'Tutup pencarian' : 'Cari'} onPress={() => setSearching((s) => !s)} />
          {!cfg.data?.muted ? <BandButton icon="add" label="Tulis postingan baru" onPress={() => router.push('/warga/baru')} /> : null}
        </View>
      ) : undefined}
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
      {c.feed.forYou ? <FeedTabs sort={sort} onSort={setTab} onTune={() => router.push('/warga/minat')} /> : null}
      <FlatList
        data={items}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        onRefresh={() => void feed.refetch()}
        onEndReachedThreshold={0.6}
        onEndReached={() => { if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage(); }}
        onViewableItemsChanged={tracking.onViewableItemsChanged}
        viewabilityConfig={tracking.viewabilityConfig}
        ListHeaderComponent={
          <View>
            <FlatList
              horizontal showsHorizontalScrollIndicator={false} data={isStaff ? SHORTCUTS.filter(([k]) => k !== 'rt') : SHORTCUTS} keyExtractor={(f) => f[0]}
              style={{ backgroundColor: colors.bg, marginBottom: 8 }} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
              renderItem={({ item: [k, label, icon] }) => <Shortcut label={label} icon={icon} on={filter === k} onPress={() => setFilter(k)} />}
            />
            {!c.muted ? <Composer name={c.me.name} onPress={() => router.push('/warga/baru')} /> : null}
            <View style={{ paddingHorizontal: spacing.md }}>
              {c.muted ? <ErrorBanner message="Akun Anda sedang dibisukan. Anda masih bisa membaca." /> : null}
              {searching ? <Field label="Cari kata atau #tag" icon="search-outline" value={text} onChangeText={setText} placeholder="contoh: #gotongroyong" autoFocus /> : null}
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
          </View>
        }
        renderItem={({ item }) => <PostCard p={item} src={src} onTag={(t) => { setSearching(true); setText(t); }} />}
        ListEmptyComponent={feed.isLoading ? <PostSkeleton /> : <View style={{ paddingHorizontal: spacing.md }}><EmptyState icon="chatbubbles-outline" title={filter === 'saved' ? 'Belum ada postingan tersimpan' : 'Belum ada postingan'} hint="Jadilah yang pertama berbagi kegiatan di desa." /></View>}
        ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : undefined}
      />
    </View>
  );
}
