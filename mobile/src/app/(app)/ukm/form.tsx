import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Switch, View } from 'react-native';
import { Text } from '@/components/text';

import { ChoiceChip, InfoBox } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, ResultState, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useMyUkm, useSaveUkm, useUkmItem, type UkmDetail, type UkmStatus } from '@/lib/queries';
import { uploadReportPhoto } from '@/lib/upload';
import { createdMessage, formatPriceInput, isFormDirty, QUICK_UNITS, UKM_LIMITS, validateUkmForm, type UkmFormValues } from '@/lib/ukm-logic';
import { colors, spacing } from '@/theme';

type Photo = { uri: string; url?: string; failed?: boolean };
type Snapshot = UkmFormValues & { photos: string[] };

const EMPTY: UkmFormValues = { name: '', description: '', priceText: '', unit: '', category: null, stockText: '', contactText: '', showContact: false };
const OVERLAY = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const toNumberText = (n: number | null) => (n === null ? '' : String(n));

/** Teks hasil setelah menyimpan perubahan, menurut status produk sesudahnya. */
function savedMessage(status: UkmStatus): { title: string; body: string } {
  if (status === 'pending') return { title: 'Perubahan terkirim', body: 'Produk Anda menunggu persetujuan desa. Anda akan diberi tahu lewat notifikasi saat sudah diperiksa.' };
  if (status === 'hidden') return { title: 'Perubahan tersimpan', body: 'Produk masih disembunyikan dari katalog. Ketuk "Tampilkan di katalog" bila ingin warga melihatnya.' };
  return { title: 'Perubahan tersimpan', body: 'Produk Anda tetap tayang di katalog desa dengan data terbaru.' };
}

/** Pembungkus: memuat data (kategori, batas, dan produk yang diubah), lalu menampilkan formulir dengan isian awal yang sudah siap. */
export default function FormProduk() {
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const editId = idParam ? Number(idParam) : undefined;
  const editing = editId !== undefined && Number.isInteger(editId);

  const mine = useMyUkm();
  const item = useUkmItem(editing ? editId : NaN);
  const d = item.data;
  const title = editing ? 'Ubah produk' : 'Jual produk';

  if (editing && (item.isLoading || mine.isLoading)) {
    return <Screen><Stack.Screen options={{ title }} /><ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /></Screen>;
  }
  if (editing && (!d || !d.canEdit)) {
    return (
      <Screen footer={<Button label="Kembali" variant="secondary" onPress={() => router.back()} />}>
        <Stack.Screen options={{ title }} />
        <ErrorBanner message={item.error instanceof ApiError ? item.error.message : 'Anda hanya bisa mengubah produk milik Anda sendiri.'} />
      </Screen>
    );
  }
  if (!mine.data) {
    return mine.isError ? (
      <Screen footer={<Button label="Coba lagi" onPress={() => void mine.refetch()} />}>
        <Stack.Screen options={{ title }} />
        <ErrorBanner message={mine.error instanceof ApiError ? mine.error.message : 'Formulir belum bisa dimuat. Coba lagi.'} />
      </Screen>
    ) : (
      <Screen><Stack.Screen options={{ title }} /><ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /></Screen>
    );
  }
  return <ProductForm editId={editing ? editId : undefined} detail={editing ? d : undefined} categories={mine.data.categories} maxPhotos={mine.data.limits.maxPhotos} moderation={mine.data.moderation} />;
}

function ProductForm({ editId, detail: d, categories, maxPhotos, moderation }: { editId?: number; detail?: UkmDetail; categories: string[]; maxPhotos: number; moderation: boolean }) {
  const editing = editId !== undefined;
  const save = useSaveUkm();
  const navigation = useNavigation();

  // Isian awal diturunkan dari data produk (state diinisialisasi sekali; formulir dibuat setelah data siap).
  const [initial] = useState<Snapshot>(() => {
    if (!d) return { ...EMPTY, photos: [] };
    return {
      name: d.name, description: d.description, priceText: formatPriceInput(toNumberText(d.price)), unit: d.unit ?? '',
      category: d.category && categories.includes(d.category) ? d.category : null, stockText: toNumberText(d.stock), photos: d.photos,
      contactText: d.contactPhone ?? '', showContact: d.showContact,
    };
  });
  const [values, setValues] = useState<UkmFormValues>(() => ({ ...initial }));
  const [photos, setPhotos] = useState<Photo[]>(() => initial.photos.map((u) => ({ uri: u, url: u })));
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: number; status: UkmStatus } | null>(null);

  const set = <K extends keyof UkmFormValues>(k: K, v: UkmFormValues[K]) => setValues((x) => ({ ...x, [k]: v }));

  const uploading = photos.some((p) => !p.url && !p.failed);
  const failed = photos.some((p) => p.failed);
  const urls = photos.map((p) => p.url).filter((u): u is string => !!u);
  const validation = validateUkmForm(values, { categories, photos: urls, maxPhotos });
  const errors = submitted && !validation.ok ? validation.errors : {};
  const dirty = isFormDirty({ ...values, photos: urls }, initial);

  // Tanya dulu sebelum keluar bila ada isian yang belum dikirim (tombol kembali, gestur, dan tombol back Android).
  usePreventRemove(dirty && result === null, ({ data }) => {
    Alert.alert('Keluar tanpa mengirim?', 'Isian Anda belum dikirim dan akan hilang.', [
      { text: 'Lanjut mengisi', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  function startUpload(uri: string) {
    setPhotos((p) => [...p, { uri }]);
    uploadReportPhoto(uri, 'ukm')
      .then((url) => setPhotos((p) => p.map((x) => (x.uri === uri ? { ...x, url } : x))))
      .catch(() => setPhotos((p) => p.map((x) => (x.uri === uri ? { ...x, failed: true } : x))));
  }

  async function pick(source: 'camera' | 'library') {
    setError(null);
    if (photos.length >= maxPhotos) return setError(`Maksimal ${maxPhotos} foto.`);
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Izin kamera ditolak. Anda bisa memilih foto dari galeri.');
    }
    const r = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1, allowsMultipleSelection: false });
    if (!r.canceled && r.assets[0]) startUpload(r.assets[0].uri);
  }

  function retry(uri: string) {
    setPhotos((p) => p.filter((x) => x.uri !== uri));
    startUpload(uri);
  }

  async function send() {
    setError(null);
    setSubmitted(true);
    if (!validation.ok) return setError('Ada isian yang perlu diperbaiki. Periksa kolom yang bertanda merah.');
    try {
      const r = await save.mutateAsync({ id: editing ? editId : undefined, input: validation.payload });
      setResult(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Terjadi kesalahan. Coba lagi.');
    }
  }

  if (result) {
    const created = !editing;
    const msg = created ? createdMessage(result.status) : savedMessage(result.status);
    return (
      <Screen
        footer={
          <Button label={created ? 'Lihat Produk saya' : 'Lihat produk'} onPress={() => (created ? router.replace({ pathname: '/ukm', params: { tab: 'mine' } }) : router.replace(`/ukm/${result.id}`))} />
        }
      >
        <Stack.Screen options={{ title: created ? 'Jual produk' : 'Ubah produk' }} />
        <ResultState title={msg.title} icon={result.status === 'pending' ? 'time' : 'checkmark-circle'}>
          <Body>{msg.body}</Body>
          {result.status === 'pending' ? <Body muted>Anda akan diberi tahu lewat notifikasi saat produk disetujui.</Body> : null}
        </ResultState>
      </Screen>
    );
  }

  const unitOn = values.unit.trim();
  return (
    <Screen
      footer={
        <Button
          label={editing ? 'Simpan perubahan' : moderation ? 'Kirim ke desa' : 'Tayangkan produk'}
          icon={editing ? 'checkmark' : 'paper-plane-outline'}
          loading={save.isPending}
          disabled={uploading || failed}
          onPress={() => void send()}
        />
      }
    >
      <Stack.Screen options={{ title: editing ? 'Ubah produk' : 'Jual produk' }} />
      <ErrorBanner message={error} />
      {!editing ? <InfoBox tone="info">{moderation ? 'Produk baru diperiksa perangkat desa dulu sebelum tayang di katalog.' : 'Produk baru langsung tayang di katalog desa setelah Anda kirim.'}</InfoBox> : null}
      {editing && d?.status === 'inactive' ? <InfoBox tone="warn">Produk ini disembunyikan desa. Setelah Anda memperbaikinya, produk dikirim ulang untuk diperiksa.</InfoBox> : null}

      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.md, marginBottom: 4 }} accessibilityRole="header">Foto produk</Text>
      <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: spacing.sm }}>Foto pertama jadi sampul. Maksimal {maxPhotos} foto. Foto yang terang dan jelas lebih menarik.</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.md }}>
        <View style={{ flex: 1 }}><Button label="Ambil foto" icon="camera-outline" disabled={photos.length >= maxPhotos} onPress={() => void pick('camera')} /></View>
        <View style={{ flex: 1 }}><Button label="Dari galeri" icon="images-outline" variant="secondary" disabled={photos.length >= maxPhotos} onPress={() => void pick('library')} /></View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.sm }}>
        {photos.map((p, i) => (
          <View key={p.uri} style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface }}>
            <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel={`Foto produk ${i + 1}${i === 0 ? ', sampul' : ''}`} />
            {i === 0 ? (
              <View style={{ position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(12,74,53,0.9)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Sampul</Text>
              </View>
            ) : null}
            {!p.url && !p.failed ? (
              <View style={{ ...OVERLAY, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
            {p.failed ? (
              <Pressable onPress={() => retry(p.uri)} accessibilityRole="button" accessibilityLabel="Unggah ulang foto" style={{ ...OVERLAY, backgroundColor: 'rgba(198,40,40,0.85)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Ulangi</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setPhotos((x) => x.filter((y) => y.uri !== p.uri))} accessibilityRole="button" accessibilityLabel={`Hapus foto ${i + 1}`} hitSlop={10} style={{ position: 'absolute', top: 2, right: 2 }}>
              <Ionicons name="close-circle" size={26} color={colors.danger} />
            </Pressable>
          </View>
        ))}
      </View>
      {failed ? <Text style={{ fontSize: 14, color: colors.danger, marginBottom: spacing.sm }}>Ada foto yang belum terunggah. Ketuk &ldquo;Ulangi&rdquo;, atau hapus fotonya.</Text> : null}
      {uploading ? <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm }}>Foto sedang diunggah. Tunggu sebentar sebelum mengirim.</Text> : null}
      {errors.photos ? <Text style={{ fontSize: 14, color: colors.danger, marginBottom: spacing.sm }}>{errors.photos}</Text> : null}

      <View style={{ marginTop: spacing.sm }}>
        <Field label="Nama produk" value={values.name} onChangeText={(t) => set('name', t)} maxLength={UKM_LIMITS.nameMax} placeholder="contoh: Keripik singkong pedas" autoCapitalize="sentences" error={errors.name} />
        <Field label="Ceritakan produknya" value={values.description} onChangeText={(t) => set('description', t)} multiline numberOfLines={4} maxLength={UKM_LIMITS.descMax} autoCapitalize="sentences" placeholder="Bahan, ukuran, rasa, cara pesan, dan lainnya" error={errors.description} hint={`${values.description.trim().length} dari ${UKM_LIMITS.descMax} huruf`} />
        <Field label="Harga (Rp)" value={values.priceText} onChangeText={(t) => set('priceText', formatPriceInput(t))} keyboardType="number-pad" placeholder="15.000" error={errors.price} hint="Boleh dikosongkan." />

        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.xs }}>Satuan</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.sm }} accessibilityRole="radiogroup">
          {QUICK_UNITS.map((u) => <ChoiceChip key={u} label={u} selected={unitOn === u} onPress={() => set('unit', unitOn === u ? '' : u)} />)}
        </View>
        <Field label="Satuan lain" value={values.unit} onChangeText={(t) => set('unit', t)} maxLength={UKM_LIMITS.unitMax} placeholder="contoh: ikat, botol" error={errors.unit} hint="Boleh dikosongkan." />

        {categories.length > 0 ? (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.xs }}>Kategori</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} accessibilityRole="radiogroup">
              {categories.map((c) => <ChoiceChip key={c} label={c} selected={values.category === c} onPress={() => set('category', values.category === c ? null : c)} />)}
            </View>
            {errors.category ? <Text style={{ fontSize: 14, color: colors.danger, marginTop: 6 }}>{errors.category}</Text> : <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 6 }}>Ketuk lagi untuk mengosongkan. Kategori diatur oleh desa.</Text>}
          </View>
        ) : null}

        <Field label="Stok (jumlah tersedia)" value={values.stockText} onChangeText={(t) => set('stockText', t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="contoh: 20" error={errors.stock} hint="Boleh dikosongkan bila tidak dihitung." />

        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.md, marginBottom: 4 }} accessibilityRole="header">Kontak penjual</Text>
        <Text style={{ fontSize: 15, color: colors.textMuted, marginBottom: spacing.sm }}>Isi bila pembeli boleh menghubungi Anda langsung. Nomor ini terpisah dari data kependudukan Anda.</Text>
        <Field label="Nomor WhatsApp / telepon" value={values.contactText} onChangeText={(t) => set('contactText', t.replace(/[^\d+\s().-]/g, '').slice(0, 20))} keyboardType="phone-pad" autoComplete="tel" placeholder="contoh: 081234567890" error={errors.contact} hint="Boleh dikosongkan." />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Tampilkan nomor ke warga lain</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>
              {values.showContact ? 'Nomor tampil di halaman produk. Matikan kapan saja bila tidak ingin dihubungi.' : 'Nomor disimpan tetapi tidak tampil. Warga menghubungi lewat kantor desa.'}
            </Text>
          </View>
          <Switch value={values.showContact} onValueChange={(on) => set('showContact', on)} accessibilityLabel="Tampilkan nomor ke warga lain" trackColor={{ true: colors.primary }} />
        </View>
      </View>
    </Screen>
  );
}
