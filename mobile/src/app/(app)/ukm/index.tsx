import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/text';

import { Chip, ChoiceChip, EmptyState, InfoBox } from '@/components/cards';
import { ProductGridSkeleton } from '@/components/skeleton';
import { Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useMyUkm, useUkmCatalog, type UkmListItem } from '@/lib/queries';
import { priceLabel, quotaLabel, statusLook } from '@/lib/ukm-logic';
import { colors, shadow, spacing } from '@/theme';

type Tab = 'all' | 'mine';

const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

/** Foto persegi; tanpa foto tampil kotak berikon agar kartu tetap rata. */
function Thumb({ uri, size, radius = 16 }: { uri: string | null; size?: number; radius?: number }) {
  const box = size ? { width: size, height: size } : { width: '100%' as const, aspectRatio: 1 };
  return uri ? (
    <Image source={{ uri }} contentFit="cover" accessibilityIgnoresInvertColors style={[box, { borderRadius: radius, backgroundColor: colors.surface }]} />
  ) : (
    <View style={[box, { borderRadius: radius, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name="image-outline" size={size ? size * 0.4 : 36} color={colors.primary} />
    </View>
  );
}

function ProductCard({ p }: { p: UkmListItem }) {
  const price = priceLabel(p.price, p.unit);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.name}. ${price}. Dijual oleh ${p.seller}.${p.mine ? ' Produk Anda.' : ''}`}
      onPress={() => router.push(`/ukm/${p.id}`)}
      style={({ pressed }) => [{ width: '48%', marginBottom: spacing.md, opacity: pressed ? 0.85 : 1 }]}
    >
      <Thumb uri={p.thumb} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8 }} numberOfLines={2}>{p.name}</Text>
      <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primaryDark, marginTop: 2 }} numberOfLines={1}>{price}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>{p.seller}</Text>
        {p.mine ? <Chip label="Produk Anda" tone="green" icon="person" /> : null}
      </View>
    </Pressable>
  );
}

/** Baris "Produk saya": foto kecil, nama, harga, dan status (teks + ikon, bukan warna saja). */
function MineRow({ p }: { p: UkmListItem }) {
  const price = priceLabel(p.price, p.unit);
  const look = statusLook(p.status ?? 'pending', p.statusLabel);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${p.name}. ${price}. Status: ${look.label}.`}
      onPress={() => router.push(`/ukm/${p.id}`)}
      style={({ pressed }) => [{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', minHeight: 88, padding: spacing.sm, marginBottom: spacing.sm, backgroundColor: colors.bg, borderRadius: 18, borderWidth: 1, borderColor: colors.border, ...shadow.card }, pressed && { opacity: 0.85 }]}
    >
      <Thumb uri={p.thumb} size={72} radius={14} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={2}>{p.name}</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primaryDark }} numberOfLines={1}>{price}</Text>
        <View style={{ flexDirection: 'row' }}><Chip label={look.label} tone={look.tone} icon={look.icon} /></View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

export default function ProdukDesa() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'mine' ? 'mine' : 'all');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  // Jeda ketikan agar tidak meminta data setiap huruf.
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const catalog = useUkmCatalog(q, category);
  const mine = useMyUkm();

  const items = useMemo(() => catalog.data?.pages.flatMap((p) => p.items) ?? [], [catalog.data]);
  const categories = catalog.data?.pages[0]?.categories ?? mine.data?.categories ?? [];
  const myItems = mine.data?.items ?? [];
  const limits = mine.data?.limits;
  const full = !!limits && myItems.length >= limits.maxProducts;
  const waiting = myItems.filter((p) => p.status === 'pending').length;

  const footer = (
    <View style={{ gap: spacing.sm }}>
      {full ? <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>Jatah produk Anda penuh. Sembunyikan atau hubungi kantor desa untuk menambah.</Text> : null}
      <Button label="Jual produk" icon="add-circle-outline" disabled={full} onPress={() => router.push('/ukm/form')} />
    </View>
  );

  return (
    <Screen scroll={false} footer={footer}>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: spacing.md }} accessibilityRole="radiogroup">
        <ChoiceChip label="Semua produk" selected={tab === 'all'} onPress={() => setTab('all')} />
        <ChoiceChip label="Produk saya" selected={tab === 'mine'} onPress={() => setTab('mine')} />
      </View>

      {tab === 'all' ? (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={({ item }) => <ProductCard p={item} />}
          refreshing={catalog.isRefetching && !catalog.isFetchingNextPage}
          onRefresh={() => void catalog.refetch()}
          onEndReachedThreshold={0.6}
          onEndReached={() => { if (catalog.hasNextPage && !catalog.isFetchingNextPage) void catalog.fetchNextPage(); }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <Field label="Cari produk" icon="search-outline" value={text} onChangeText={setText} placeholder="contoh: keripik, kain tenun" returnKeyType="search" autoCapitalize="none" />
              {categories.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: spacing.md }} accessibilityRole="radiogroup">
                  <ChoiceChip label="Semua" selected={category === null} onPress={() => setCategory(null)} />
                  {categories.map((c) => <ChoiceChip key={c} label={c} selected={category === c} onPress={() => setCategory(category === c ? null : c)} />)}
                </ScrollView>
              ) : null}
              {catalog.isError ? <ErrorBanner message={errText(catalog.error, 'Produk belum bisa dimuat. Tarik layar ke bawah untuk mencoba lagi.')} /> : null}
            </View>
          }
          ListEmptyComponent={
            catalog.isLoading ? <ProductGridSkeleton /> : catalog.isError ? undefined : (
              <EmptyState
                icon="storefront-outline"
                title={q || category ? 'Produk tidak ditemukan' : 'Belum ada produk di desa ini'}
                hint={q || category ? 'Coba kata lain, atau pilih kategori "Semua".' : 'Punya usaha atau hasil karya? Jadilah yang pertama menampilkan produk Anda di sini.'}
              />
            )
          }
          ListFooterComponent={catalog.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : undefined}
        />
      ) : (
        <FlatList
          data={myItems}
          keyExtractor={(p) => String(p.id)}
          renderItem={({ item }) => <MineRow p={item} />}
          refreshing={mine.isRefetching}
          onRefresh={() => void mine.refetch()}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.sm }}>
              {limits ? <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: spacing.sm }}>{quotaLabel(myItems.length, limits.maxProducts)}</Text> : null}
              {waiting > 0 ? <InfoBox tone="info" icon="time-outline">{waiting} produk menunggu persetujuan desa. Produk baru tayang setelah diperiksa perangkat desa.</InfoBox> : null}
              {mine.isError ? <ErrorBanner message={errText(mine.error, 'Produk Anda belum bisa dimuat. Tarik layar ke bawah untuk mencoba lagi.')} /> : null}
            </View>
          }
          ListEmptyComponent={
            mine.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : mine.isError ? undefined : (
              <EmptyState icon="pricetag-outline" title="Anda belum punya produk" hint="Tambahkan foto, nama, dan harga. Setelah diperiksa desa, produk Anda tampil untuk semua warga." />
            )
          }
        />
      )}
    </Screen>
  );
}
