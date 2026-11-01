import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { Text } from '@/components/text';

import { InfoBox } from '@/components/cards';
import { Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { usePlaceUkmOrder } from '@/lib/queries';
import { ORDER_LIMITS, parseQuantity, placedMessage, stepQuantity } from '@/lib/ukm-order-logic';
import { colors, spacing } from '@/theme';

/** Form pesan sederhana: jumlah + catatan. Pesanan tercatat di desa; lanjut ke WhatsApp bila penjual mengizinkan kontak. Tanpa pembayaran. */
export default function PesanProduk() {
  const p = useLocalSearchParams<{ productId: string; name?: string; unit?: string; stock?: string }>();
  const productId = Number(p.productId);
  const stock = p.stock && /^\d+$/.test(p.stock) ? Number(p.stock) : null;
  const [qtyText, setQtyText] = useState('1');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const place = usePlaceUkmOrder();
  const qty = parseQuantity(qtyText);

  function bump(delta: 1 | -1) {
    setQtyText(String(stepQuantity(qty ?? 1, delta, stock)));
  }

  function submit() {
    setError(null);
    if (qty === null) return setError(`Jumlah harus bilangan bulat 1 sampai ${ORDER_LIMITS.maxQuantity}.`);
    if (stock !== null && stock > 0 && qty > stock) return setError(`Stok tersisa ${stock}. Kurangi jumlah pesanan.`);
    place.mutate(
      { productId, quantity: qty, note: note.trim() || null },
      {
        onSuccess: ({ order }) => {
          const msg = placedMessage(!!order.whatsappUrl);
          router.replace({ pathname: '/ukm/pesanan/[id]', params: { id: String(order.id) } });
          Alert.alert(msg.title, msg.body, order.whatsappUrl ? [
            { text: 'Nanti saja', style: 'cancel' },
            { text: 'Buka WhatsApp', onPress: () => void Linking.openURL(order.whatsappUrl as string).catch(() => Alert.alert('Tidak bisa dibuka', 'WhatsApp belum terpasang di perangkat ini.')) },
          ] : [{ text: 'Mengerti' }]);
        },
        onError: (e) => setError(e instanceof ApiError ? e.message : 'Pesanan belum terkirim. Coba lagi.'),
      },
    );
  }

  return (
    <Screen footer={<Button label="Kirim pesanan" icon="bag-check-outline" loading={place.isPending} onPress={submit} />}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }} accessibilityRole="header">{p.name ?? 'Pesan produk'}</Text>
      <View style={{ marginTop: spacing.md }}>
        <InfoBox tone="info">Pesanan tercatat di desa dan penjual diberi tahu. Belum ada pembayaran lewat aplikasi: harga dan pengambilan disepakati langsung dengan penjual.</InfoBox>
      </View>

      <View style={{ marginTop: spacing.md }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6 }}>Jumlah{p.unit ? ` (${p.unit})` : ''}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
          <View style={{ width: 56 }}><Button label="-" variant="secondary" onPress={() => bump(-1)} /></View>
          <View style={{ flex: 1 }}>
            <Field label="Jumlah" value={qtyText} onChangeText={(t) => setQtyText(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" error={qty === null ? 'Isi jumlah 1 atau lebih.' : null} hint={stock !== null ? `Stok tersedia: ${stock}` : undefined} />
          </View>
          <View style={{ width: 56 }}><Button label="+" variant="secondary" onPress={() => bump(1)} /></View>
        </View>
      </View>

      <Field label="Catatan untuk penjual (boleh dikosongkan)" value={note} onChangeText={(t) => setNote(t.slice(0, ORDER_LIMITS.noteMax))} multiline placeholder="Contoh: yang pedas, diambil sore hari" hint={`${note.length}/${ORDER_LIMITS.noteMax}`} />
      <ErrorBanner message={error} />
    </Screen>
  );
}
