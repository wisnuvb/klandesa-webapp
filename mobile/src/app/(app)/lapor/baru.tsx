import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';

import { Card } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { addToOutbox } from '@/lib/outbox';
import { useCreateReport } from '@/lib/queries';
import { useSession } from '@/state/session';
import { uploadReportPhoto } from '@/lib/upload';
import { colors, spacing } from '@/theme';

const CATEGORIES = [
  { key: 'jalan', label: 'Jalan / Drainase', icon: 'trail-sign-outline' },
  { key: 'lampu', label: 'Lampu jalan', icon: 'bulb-outline' },
  { key: 'sampah', label: 'Sampah', icon: 'trash-outline' },
  { key: 'air', label: 'Air bersih', icon: 'water-outline' },
  { key: 'keamanan', label: 'Keamanan', icon: 'shield-outline' },
  { key: 'lainnya', label: 'Lainnya', icon: 'ellipsis-horizontal-circle-outline' },
] as const;

type Photo = { uri: string; url?: string; failed?: boolean };
type Step = 'photo' | 'issue' | 'place' | 'review' | 'done';
const ORDER: Step[] = ['photo', 'issue', 'place', 'review'];

export default function NewReport() {
  const create = useCreateReport();
  const accountId = useSession().profile?.account.id;
  const [queued, setQueued] = useState(false);
  const [step, setStep] = useState<Step>('photo');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number | null } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [note, setNote] = useState('');
  const [anon, setAnon] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<number | null>(null);

  function startUpload(uri: string) {
    setPhotos((p) => [...p, { uri }]);
    uploadReportPhoto(uri)
      .then((url) => setPhotos((p) => p.map((x) => (x.uri === uri ? { ...x, url } : x))))
      .catch(() => setPhotos((p) => p.map((x) => (x.uri === uri ? { ...x, failed: true } : x))));
  }

  async function pick(source: 'camera' | 'library') {
    setError(null);
    if (photos.length >= 3) return setError('Maksimal 3 foto.');
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

  async function useMyLocation() {
    setLocBusy(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return setError('Izin lokasi ditolak. Tulis RT/dusun atau patokan lokasi di bawah.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy ?? null });
    } catch {
      setError('Lokasi belum terbaca. Pastikan GPS aktif, atau tulis patokan lokasi di bawah.');
    } finally {
      setLocBusy(false);
    }
  }

  const uploading = photos.some((p) => !p.url && !p.failed);
  const failed = photos.some((p) => p.failed);
  const canNext: Record<Step, boolean> = {
    photo: !uploading && !failed,
    issue: !!category && content.trim().length >= 10,
    place: true,
    review: !uploading && !failed,
    done: true,
  };

  async function send() {
    setError(null);
    const input = {
      category: category!, content: content.trim(), photos: photos.map((p) => p.url!).filter(Boolean),
      isAnonymous: anon, isPublic,
      ...(coords ? { location: { lat: coords.lat, lng: coords.lng } } : {}),
      ...(note.trim() ? { locationNote: note.trim() } : {}),
    };
    try {
      const r = await create.mutateAsync(input);
      setDoneId(r.id);
      setStep('done');
    } catch (e) {
      // Tanpa sinyal: simpan di HP dan kirim otomatis nanti, jangan buang ketikan warga.
      if (e instanceof ApiError && e.code === 'NETWORK' && accountId != null && (await addToOutbox(accountId, 'report', `Laporan: ${content.trim().slice(0, 40)}`, input))) {
        setQueued(true);
        setStep('done');
        return;
      }
      setError(e instanceof ApiError ? e.message : 'Terjadi kesalahan. Coba lagi.');
    }
  }

  if (step === 'done' && queued) {
    return (
      <Screen footer={<Button label="Kembali ke beranda" onPress={() => router.replace('/')} />}>
        <Title>Laporan tersimpan</Title>
        <Body>Sinyal sedang tidak ada. Laporan Anda aman di HP dan akan dikirim otomatis saat sinyal kembali.</Body>
        <Body muted>Buka aplikasi sesekali agar pengirimannya jalan.</Body>
      </Screen>
    );
  }

  if (step === 'done' && doneId) {
    return (
      <Screen footer={<Button label="Lihat status laporan" onPress={() => router.replace(`/lapor/${doneId}`)} />}>
        <Title>Laporan terkirim ✓</Title>
        <Body>Terima kasih sudah melapor. Perangkat desa akan memeriksa laporan Anda.</Body>
        <Body muted>Anda akan diberi tahu lewat notifikasi saat ada tanggapan.</Body>
      </Screen>
    );
  }

  const idx = ORDER.indexOf(step);
  const next = () => setStep(ORDER[idx + 1]!);

  return (
    <Screen
      footer={
        step === 'review'
          ? <Button label="Kirim ke Desa" loading={create.isPending} disabled={!canNext.review} onPress={send} />
          : <Button label={step === 'photo' && photos.length === 0 ? 'Lewati, tanpa foto' : 'Lanjut'} disabled={!canNext[step]} onPress={next} />
      }
    >
      <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 4 }}>Langkah {idx + 1} dari {ORDER.length}</Text>
      <ErrorBanner message={error} />

      {step === 'photo' ? (
        <>
          <Title>Foto masalahnya</Title>
          <Body muted>Foto membantu desa memahami masalah dengan cepat. Maksimal 3 foto.</Body>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.md }}>
            <View style={{ flex: 1 }}><Button label="Ambil foto" onPress={() => void pick('camera')} /></View>
            <View style={{ flex: 1 }}><Button label="Dari galeri" variant="secondary" onPress={() => void pick('library')} /></View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {photos.map((p) => (
              <View key={p.uri} style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface }}>
                <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel="Foto laporan" />
                {!p.url && !p.failed ? (
                  <View style={{ ...StyleAbs, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : null}
                {p.failed ? (
                  <Pressable onPress={() => retry(p.uri)} accessibilityRole="button" accessibilityLabel="Unggah ulang foto" style={{ ...StyleAbs, backgroundColor: 'rgba(198,40,40,0.85)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Ulangi</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setPhotos((x) => x.filter((y) => y.uri !== p.uri))} accessibilityRole="button" accessibilityLabel="Hapus foto" hitSlop={8} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 12 }}>
                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
          {failed ? <Body muted>Ada foto yang belum terunggah. Ketuk “Ulangi”, atau hapus fotonya.</Body> : null}
        </>
      ) : null}

      {step === 'issue' ? (
        <>
          <Title>Apa masalahnya?</Title>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.md }}>
            {CATEGORIES.map((c) => {
              const on = category === c.key;
              return (
                <Pressable
                  key={c.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setCategory(c.key)}
                  style={{ width: '47%', minHeight: 72, borderRadius: 14, borderWidth: 2, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? '#E3F3EA' : colors.bg, alignItems: 'center', justifyContent: 'center', padding: 8 }}
                >
                  <Ionicons name={c.icon} size={26} color={on ? colors.primary : colors.text} />
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 4, textAlign: 'center' }}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Field label="Ceritakan singkat" value={content} onChangeText={setContent} autoCapitalize="sentences" multiline maxLength={1500} hint="Minimal 10 huruf. Contoh: Lampu jalan depan balai RT 03 mati sejak seminggu." />
        </>
      ) : null}

      {step === 'place' ? (
        <>
          <Title>Di mana lokasinya?</Title>
          <Body muted>Lokasi hanya dipakai agar desa tahu letak masalahnya. Boleh dilewati.</Body>
          {coords ? (
            <Card>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>Lokasi terpasang ✓</Text>
              {coords.acc != null ? <Text style={{ fontSize: 14, color: colors.textMuted }}>Ketelitian ±{Math.round(coords.acc)} meter</Text> : null}
              <Button label="Hapus lokasi" variant="link" onPress={() => setCoords(null)} />
            </Card>
          ) : (
            <Button label="Pakai lokasi saya sekarang" variant="secondary" loading={locBusy} onPress={useMyLocation} />
          )}
          <View style={{ height: spacing.md }} />
          <Field label="RT / dusun / patokan" value={note} onChangeText={setNote} autoCapitalize="sentences" maxLength={200} hint="Contoh: RT 03, depan balai warga" />
        </>
      ) : null}

      {step === 'review' ? (
        <>
          <Title>Periksa & kirim</Title>
          <Card>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Jenis</Text>
            <Text style={{ fontSize: 17, color: colors.text, marginBottom: 8 }}>{CATEGORIES.find((c) => c.key === category)?.label}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Cerita</Text>
            <Text style={{ fontSize: 17, color: colors.text, marginBottom: 8 }}>{content.trim()}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>Foto · Lokasi</Text>
            <Text style={{ fontSize: 17, color: colors.text }}>{photos.length} foto · {coords ? 'GPS terpasang' : note.trim() || 'tanpa lokasi'}</Text>
          </Card>
          <ToggleRow label="Sembunyikan nama saya dari warga lain" hint="Perangkat desa tetap tahu siapa pelapornya." value={anon} onChange={setAnon} />
          <ToggleRow label="Boleh dilihat warga lain" hint="Bila mati, hanya perangkat desa yang melihat laporan ini." value={isPublic} onChange={setIsPublic} />
        </>
      ) : null}
    </Screen>
  );
}

const StyleAbs = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

function ToggleRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: colors.primary }} />
    </View>
  );
}
