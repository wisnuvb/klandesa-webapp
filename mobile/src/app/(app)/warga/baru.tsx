import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Body, Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, api, post } from '@/lib/api';
import { useInvalidateSocial, useSocialConfig } from '@/lib/queries';
import { uploadReportPhoto } from '@/lib/upload';
import { colors, spacing } from '@/theme';

const CATS: [string, string][] = [['kegiatan', 'Kegiatan'], ['usaha', 'Usaha'], ['info', 'Info'], ['lainnya', 'Lainnya']];
type Photo = { uri: string; url?: string; failed?: boolean };

export default function NewPost() {
  const p = useLocalSearchParams<{ editId?: string; text?: string }>();
  const editing = !!p.editId;
  const cfg = useSocialConfig();
  const invalidate = useInvalidateSocial();
  const max = cfg.data?.limits.photos ?? 4;
  const maxChars = cfg.data?.limits.postChars ?? 1000;

  const [content, setContent] = useState(p.text ?? '');
  const [category, setCategory] = useState('kegiatan');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showVideo, setShowVideo] = useState(false);
  const [video, setVideo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startUpload(uri: string) {
    setPhotos((x) => [...x, { uri }]);
    uploadReportPhoto(uri, 'social')
      .then((url) => setPhotos((x) => x.map((y) => (y.uri === uri ? { ...y, url } : y))))
      .catch(() => setPhotos((x) => x.map((y) => (y.uri === uri ? { ...y, failed: true } : y))));
  }
  async function pick(source: 'camera' | 'library') {
    setError(null);
    const left = max - photos.length;
    if (left <= 0) return setError(`Maksimal ${max} foto.`);
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Izin kamera ditolak. Pilih foto dari galeri.');
    }
    const r = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1, allowsMultipleSelection: true, selectionLimit: left });
    if (!r.canceled) r.assets.slice(0, left).forEach((a) => startUpload(a.uri));
  }

  const uploading = photos.some((x) => !x.url && !x.failed);
  const failed = photos.some((x) => x.failed);
  const hasMedia = photos.length > 0 || video.trim().length > 0;
  const valid = editing ? content.trim().length > 0 : (content.trim().length > 0 || hasMedia) && !uploading && !failed;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await api(`/social/posts/${p.editId}`, { method: 'PATCH', body: JSON.stringify({ content: content.trim() }) });
        invalidate();
        return router.back();
      }
      const r = await post<{ id: number; status: string }>('/social/posts', {
        content: content.trim(), category, photos: photos.map((x) => x.url).filter(Boolean),
        ...(video.trim() ? { youtubeUrl: video.trim() } : {}),
      });
      invalidate();
      if (r.status === 'PENDING') {
        Alert.alert('Terkirim', 'Postingan Anda akan tampil setelah dicek perangkat desa (biasanya kurang dari 1 jam).', [{ text: 'OK', onPress: () => router.back() }]);
      } else {
        router.back();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim. Tulisan Anda masih tersimpan, coba lagi.');
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button label={editing ? 'Simpan perubahan' : 'Bagikan ke Warga'} disabled={!valid} loading={busy} onPress={submit} />}>
      <ErrorBanner message={error} />
      {!editing ? (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md, flexWrap: 'wrap' }}>
          {CATS.map(([k, l]) => (
            <Pressable key={k} onPress={() => setCategory(k)} accessibilityRole="button" accessibilityState={{ selected: category === k }}
              style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', borderWidth: 1.5, borderColor: category === k ? colors.primary : colors.border, backgroundColor: category === k ? '#E3F3EA' : colors.bg }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{l}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Field label={editing ? 'Ubah tulisan' : 'Apa yang ingin Anda bagikan?'} value={content} onChangeText={setContent} autoCapitalize="sentences" multiline maxLength={maxChars} hint={`${content.length}/${maxChars} · gunakan #tagar agar mudah dicari`} />

      {!editing ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.sm }}>
            {photos.map((x) => (
              <View key={x.uri} style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface }}>
                <Image source={{ uri: x.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" accessibilityLabel="Foto" />
                {!x.url && !x.failed ? <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View> : null}
                {x.failed ? (
                  <Pressable onPress={() => { setPhotos((a) => a.filter((b) => b.uri !== x.uri)); startUpload(x.uri); }} accessibilityRole="button" accessibilityLabel="Unggah ulang"
                    style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(198,40,40,0.85)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Ulangi</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setPhotos((a) => a.filter((b) => b.uri !== x.uri))} accessibilityRole="button" accessibilityLabel="Hapus foto" hitSlop={8} style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 12 }}>
                  <Ionicons name="close-circle" size={24} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
          {!video.trim() && photos.length < max ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Button label="Ambil foto" variant="secondary" onPress={() => void pick('camera')} /></View>
              <View style={{ flex: 1 }}><Button label="Dari galeri" variant="secondary" onPress={() => void pick('library')} /></View>
            </View>
          ) : null}
          {photos.length === 0 ? (
            showVideo || video ? (
              <View style={{ marginTop: spacing.md }}>
                <Field label="Tautan video YouTube" value={video} onChangeText={setVideo} keyboardType="url" placeholder="https://youtu.be/..." hint="Hanya YouTube. Video tidak diunggah ke aplikasi." />
              </View>
            ) : <Button label="+ Tambah video YouTube" variant="link" onPress={() => setShowVideo(true)} />
          ) : null}
          <Body muted>Jangan unggah foto anak tanpa izin orang tuanya, dan jangan membagikan data pribadi orang lain.</Body>
        </>
      ) : <Body muted>Postingan hanya bisa diedit dalam 15 menit pertama.</Body>}
    </Screen>
  );
}
