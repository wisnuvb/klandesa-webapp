import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/text';

import { Chip, ChoiceChip, EmptyState } from '@/components/cards';
import { Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { timeAgoId } from '@/lib/format';
import { useUkmOrders, type UkmOrder } from '@/lib/queries';
import { orderLook } from '@/lib/ukm-order-logic';
import { colors, shadow, spacing } from '@/theme';

function Row({ o, mine }: { o: UkmOrder; mine: boolean }) {
  const look = orderLook(o.status);
  const who = mine ? `Penjual: ${o.seller.name}` : `Pembeli: ${o.buyer.name}${o.buyer.area ? `, ${o.buyer.area}` : ''}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${o.productName}, ${o.quantity}${o.unit ? ` ${o.unit}` : ''}. ${who}. Status: ${look.label}.`}
      onPress={() => router.push({ pathname: '/ukm/pesanan/[id]', params: { id: String(o.id) } })}
      style={({ pressed }) => [{ minHeight: 88, padding: spacing.md, marginBottom: spacing.sm, gap: 4, backgroundColor: colors.bg, borderRadius: 18, borderWidth: 1, borderColor: colors.border, ...shadow.card }, pressed && { opacity: 0.85 }]}
    >
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={2}>{o.productName}</Text>
      <Text style={{ fontSize: 14, color: colors.text }}>{o.quantity}{o.unit ? ` ${o.unit}` : ''} · {timeAgoId(o.createdAt)}</Text>
      <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>{who}</Text>
      <View style={{ flexDirection: 'row', marginTop: 2 }}><Chip label={look.label} tone={look.tone} icon={look.icon} /></View>
    </Pressable>
  );
}

export default function PesananUkm() {
  const [peran, setPeran] = useState<'beli' | 'jual'>('beli');
  const q = useUkmOrders(peran);
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const pending = q.data?.pages[0]?.pendingForMe ?? 0;

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }}>
        <ChoiceChip label="Pesanan saya" selected={peran === 'beli'} onPress={() => setPeran('beli')} />
        <ChoiceChip label={pending > 0 ? `Pesanan masuk (${pending} baru)` : 'Pesanan masuk'} selected={peran === 'jual'} onPress={() => setPeran('jual')} />
      </View>
      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Pesanan belum bisa dimuat. Tarik layar ke bawah untuk mencoba lagi.'} /> : null}
      {!q.isLoading && !q.isError && items.length === 0 ? (
        peran === 'beli'
          ? <EmptyState icon="bag-handle-outline" title="Belum ada pesanan" hint="Buka produk desa, pilih produk, lalu ketuk Pesan." />
          : <EmptyState icon="storefront-outline" title="Belum ada pesanan masuk" hint="Pesanan untuk produk Anda akan muncul di sini dan Anda diberi tahu." />
      ) : null}
      {items.map((o) => <Row key={o.id} o={o} mine={peran === 'beli'} />)}
      {q.hasNextPage ? <Button label="Muat lebih banyak" variant="secondary" loading={q.isFetchingNextPage} onPress={() => void q.fetchNextPage()} /> : null}
    </Screen>
  );
}
