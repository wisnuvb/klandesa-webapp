import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/text';

import { Avatar, Chip, InfoBox } from '@/components/cards';
import { Body, Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useToggleUkmVisible, useUkmItem } from '@/lib/queries';
import { contactLinks, formatPhone, priceLabel, statusLook } from '@/lib/ukm-logic';
import { colors, spacing } from '@/theme';

/** Galeri foto geser horizontal dengan penanda halaman (angka dan titik). */
function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const { width } = useWindowDimensions();
  const size = width - spacing.lg * 2;
  const [page, setPage] = useState(0);

  if (photos.length === 0) {
    return (
      <View style={{ width: size, height: size * 0.6, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Produk ini belum punya foto">
        <Ionicons name="image-outline" size={48} color={colors.primary} />
        <Text style={{ fontSize: 14, color: colors.primary, marginTop: 6 }}>Belum ada foto</Text>
      </View>
    );
  }
  return (
    <View>
      <FlatList
        data={photos}
        keyExtractor={(u, i) => `${i}-${u}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width: size, borderRadius: 20 }}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / size))}
        renderItem={({ item, index }) => (
          <Image
            source={{ uri: item }}
            contentFit="cover"
            accessibilityLabel={`Foto ${index + 1} dari ${photos.length}: ${name}`}
            accessibilityIgnoresInvertColors
            style={{ width: size, height: size, backgroundColor: colors.surface }}
          />
        )}
      />
      {photos.length > 1 ? (
        <View style={{ alignItems: 'center', marginTop: spacing.sm, gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {photos.map((_, i) => (
              <View key={i} style={{ width: i === page ? 18 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? colors.primary : colors.border }} />
            ))}
          </View>
          <Text style={{ fontSize: 13, color: colors.textMuted }} accessibilityLiveRegion="polite">Foto {page + 1} dari {photos.length}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Kontak penjual: orang lain melihat tombol hubungi (bila pemilik mengizinkan); pemilik melihat status tampilnya. */
function ContactCard({ phone, mine, shown }: { phone: string | null; mine: boolean; shown: boolean }) {
  async function open(url: string, fallback: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Tidak bisa dibuka', fallback);
    }
  }

  if (mine) {
    return (
      <View style={{ marginTop: spacing.md }}>
        <InfoBox tone="info">
          {phone
            ? shown
              ? `Nomor ${formatPhone(phone)} tampil ke warga lain di halaman ini. Ubah lewat "Ubah produk".`
              : `Nomor ${formatPhone(phone)} tidak ditampilkan. Aktifkan lewat "Ubah produk" bila ingin dihubungi pembeli.`
            : 'Belum ada nomor kontak. Tambahkan lewat "Ubah produk" bila ingin dihubungi pembeli.'}
        </InfoBox>
      </View>
    );
  }
  if (!phone) {
    return <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: spacing.md }}>Penjual tidak mencantumkan kontak. Tanyakan lewat kantor desa.</Text>;
  }
  const links = contactLinks(phone);
  return (
    <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }} accessibilityRole="header">Hubungi penjual</Text>
      <Text style={{ fontSize: 16, color: colors.text }} selectable>{formatPhone(phone)}</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Button label="WhatsApp" icon="logo-whatsapp" onPress={() => void open(links.whatsapp, 'WhatsApp belum terpasang di perangkat ini. Anda bisa menelepon nomor di atas.')} /></View>
        <View style={{ flex: 1 }}><Button label="Telepon" icon="call-outline" variant="secondary" onPress={() => void open(links.tel, 'Perangkat ini tidak bisa menelepon. Catat nomor di atas.')} /></View>
      </View>
    </View>
  );
}

export default function ProdukDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = Number(raw);
  const item = useUkmItem(id);
  const toggle = useToggleUkmVisible();
  const [error, setError] = useState<string | null>(null);
  const d = item.data;

  if (item.isLoading) {
    return <Screen><ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /></Screen>;
  }
  if (!d) {
    return (
      <Screen footer={<Button label="Kembali ke Produk desa" variant="secondary" onPress={() => router.replace('/ukm')} />}>
        <ErrorBanner message={item.error instanceof ApiError ? item.error.message : 'Produk tidak ditemukan atau sudah tidak tayang.'} />
        <Body muted>Produk bisa saja sudah disembunyikan oleh penjualnya.</Body>
      </Screen>
    );
  }

  const look = statusLook(d.status, d.statusLabel);
  const hide = d.status === 'active';

  function confirmToggle() {
    setError(null);
    Alert.alert(
      hide ? 'Sembunyikan produk?' : 'Tampilkan produk?',
      hide ? 'Produk tidak akan terlihat oleh warga lain sampai Anda menampilkannya lagi.' : 'Produk akan kembali tampil di katalog desa.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: hide ? 'Sembunyikan' : 'Tampilkan',
          onPress: () => toggle.mutate({ id, visible: !hide }, { onError: (e) => setError(e instanceof ApiError ? e.message : 'Belum berhasil. Coba lagi.') }),
        },
      ],
    );
  }

  const canOrder = !d.mine && d.status === 'active' && d.stock !== 0;
  const footer = !d.canEdit && canOrder ? (
    <View style={{ gap: spacing.sm }}>
      <Button label="Pesan produk ini" icon="bag-add-outline" onPress={() => router.push({ pathname: '/ukm/pesanan/baru', params: { productId: String(d.id), name: d.name, unit: d.unit ?? '', stock: d.stock === null ? '' : String(d.stock) } })} />
      <Button label="Pesanan saya" icon="receipt-outline" variant="secondary" onPress={() => router.push('/ukm/pesanan')} />
    </View>
  ) : d.canEdit ? (
    <View style={{ gap: spacing.sm }}>
      <Button label="Ubah produk" icon="create-outline" onPress={() => router.push({ pathname: '/ukm/form', params: { id: String(d.id) } })} />
      <Button label="Pesanan masuk" icon="receipt-outline" variant="secondary" onPress={() => router.push('/ukm/pesanan')} />
      {d.canToggleVisible ? (
        <Button label={hide ? 'Sembunyikan dari katalog' : 'Tampilkan di katalog'} icon={hide ? 'eye-off-outline' : 'eye-outline'} variant="secondary" loading={toggle.isPending} onPress={confirmToggle} />
      ) : null}
    </View>
  ) : undefined;

  return (
    <Screen footer={footer}>
      <Gallery photos={d.photos} name={d.name} />

      <View style={{ marginTop: spacing.md }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }} accessibilityRole="header">{d.name}</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primaryDark, marginTop: 4 }}>{priceLabel(d.price, d.unit)}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm }}>
          {d.category ? <Chip label={d.category} icon="pricetag-outline" /> : null}
          {d.stock !== null ? <Chip label={d.stock > 0 ? `Stok ${d.stock}${d.unit ? ` ${d.unit}` : ''}` : 'Stok habis'} tone={d.stock > 0 ? 'green' : 'red'} icon="cube-outline" /> : null}
        </View>
      </View>

      {d.mine ? (
        <View style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', marginBottom: spacing.sm }}><Chip label={look.label} tone={look.tone} icon={look.icon} /></View>
          {d.statusNote ? <InfoBox tone={d.status === 'inactive' ? 'warn' : 'info'}>{d.statusNote}</InfoBox> : null}
          <ErrorBanner message={error} />
        </View>
      ) : null}

      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs }} accessibilityRole="header">Tentang produk</Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: colors.text }} selectable>{d.description}</Text>

      <ContactCard phone={d.contactPhone} mine={d.mine} shown={d.showContact} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg, padding: spacing.md, borderRadius: 18, backgroundColor: colors.surface }} accessible accessibilityLabel={`Dijual oleh ${d.seller}${d.sellerArea ? `, ${d.sellerArea}` : ''}`}>
        <Avatar name={d.seller} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>Dijual oleh</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{d.seller}</Text>
          {d.sellerArea ? <Text style={{ fontSize: 14, color: colors.textMuted }}>{d.sellerArea}</Text> : null}
        </View>
      </View>
      <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: spacing.sm }}>Diperbarui {formatDateId(d.updatedAt)}</Text>
    </Screen>
  );
}
