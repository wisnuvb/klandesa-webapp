import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Linking, Pressable, Share, Text, View, type LayoutChangeEvent } from 'react-native';

import { ApiError, api, post } from '@/lib/api';
import { timeAgoId } from '@/lib/format';
import { useInvalidateSocial, type SocialPost } from '@/lib/queries';
import { colors, spacing } from '@/theme';

const CATEGORY_LABEL: Record<string, string> = { kegiatan: 'Kegiatan', usaha: 'Usaha', info: 'Info', lainnya: 'Lainnya' };

/** Teks dengan #hashtag berwarna; ketuk hashtag mencari. */
function RichText({ text, numberOfLines, onTag }: { text: string; numberOfLines?: number; onTag?: (tag: string) => void }) {
  const parts = text.split(/(#[\p{L}\p{N}_]{2,30})/gu);
  return (
    <Text style={{ fontSize: 17, lineHeight: 25, color: colors.text }} numberOfLines={numberOfLines}>
      {parts.map((p, i) => p.startsWith('#') && p.length > 2 ? (
        <Text key={i} style={{ color: colors.primary, fontWeight: '600' }} onPress={() => onTag?.(p)}>{p}</Text>
      ) : p)}
    </Text>
  );
}

function Carousel({ photos, onOpen }: { photos: string[]; onOpen: () => void }) {
  const [w, setW] = useState(0);
  const [idx, setIdx] = useState(0);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ marginTop: spacing.sm }}>
      {w > 0 ? (
        <FlatList
          horizontal pagingEnabled showsHorizontalScrollIndicator={false} data={photos} keyExtractor={(u) => u}
          onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / w))}
          renderItem={({ item }) => (
            <Pressable onPress={onOpen} accessibilityRole="imagebutton" accessibilityLabel="Foto postingan">
              <Image source={{ uri: item }} style={{ width: w, height: w * 0.75, borderRadius: 12 }} contentFit="cover" />
            </Pressable>
          )}
        />
      ) : null}
      {photos.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }} accessibilityLabel={`Foto ${idx + 1} dari ${photos.length}`}>
          {photos.map((_, i) => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === idx ? colors.primary : colors.border }} />)}
        </View>
      ) : null}
    </View>
  );
}

export function PostCard({ p, detail, onTag }: { p: SocialPost; detail?: boolean; onTag?: (tag: string) => void }) {
  const [liked, setLiked] = useState(p.liked);
  const [likes, setLikes] = useState(p.likes);
  const [saved, setSaved] = useState(p.saved);
  const invalidate = useInvalidateSocial();

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      const r = await post<{ liked: boolean; likes: number }>(`/social/posts/${p.id}/like`, { liked: next });
      setLikes(r.likes);
    } catch {
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
    }
  }
  async function toggleSave() {
    const next = !saved;
    setSaved(next);
    try { await post(`/social/posts/${p.id}/bookmark`, { saved: next }); } catch { setSaved(!next); }
  }
  async function shareWa() {
    const text = `${p.author.name} di Warga Klandesa:\n\n${p.content.slice(0, 280)}${p.content.length > 280 ? '…' : ''}${p.youtube ? `\n${p.youtube.url}` : ''}\n\nBuka aplikasi Klandesa untuk melihat selengkapnya.`;
    const wa = `whatsapp://send?text=${encodeURIComponent(text)}`;
    if (await Linking.canOpenURL(wa).catch(() => false)) void Linking.openURL(wa);
    else void Share.share({ message: text });
  }
  function menu() {
    if (p.mine) {
      Alert.alert('Postingan Anda', undefined, [
        ...(p.canEdit ? [{ text: 'Edit', onPress: () => router.push({ pathname: '/warga/baru', params: { editId: String(p.id), text: p.content } }) }] : []),
        { text: 'Hapus', style: 'destructive' as const, onPress: () => Alert.alert('Hapus postingan?', 'Tidak bisa dikembalikan.', [{ text: 'Batal', style: 'cancel' }, { text: 'Hapus', style: 'destructive', onPress: () => void del() }]) },
        { text: 'Batal', style: 'cancel' as const },
      ]);
    } else {
      Alert.alert(p.author.name, undefined, [
        { text: 'Laporkan', onPress: () => router.push({ pathname: '/warga/laporkan', params: { targetType: 'post', targetId: String(p.id) } }) },
        { text: `Blokir ${p.author.name}`, style: 'destructive', onPress: () => void block() },
        { text: 'Batal', style: 'cancel' },
      ]);
    }
  }
  async function del() {
    try { await api(`/social/posts/${p.id}`, { method: 'DELETE' }); invalidate(); if (detail) router.back(); }
    catch (e) { Alert.alert('Gagal', e instanceof ApiError ? e.message : 'Coba lagi.'); }
  }
  async function block() {
    try { await post('/social/blocks', { accountId: p.author.id, blocked: true }); invalidate(); if (detail) router.back(); Alert.alert('Diblokir', `Postingan ${p.author.name} tidak akan tampil lagi. Bisa dibuka di Saya → Akun diblokir.`); }
    catch (e) { Alert.alert('Gagal', e instanceof ApiError ? e.message : 'Coba lagi.'); }
  }
  const open = () => { if (!detail) router.push(`/warga/${p.id}`); };

  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>{p.author.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{p.author.name}{p.author.rt ? ` · RT ${p.author.rt}` : ''}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{CATEGORY_LABEL[p.category] ?? p.category} · {timeAgoId(p.createdAt)}{p.editedAt ? ' · diedit' : ''}</Text>
        </View>
        <Pressable onPress={menu} accessibilityRole="button" accessibilityLabel="Menu postingan" hitSlop={12} style={{ padding: 6 }}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {p.pending ? <Text style={{ marginTop: 8, fontSize: 14, fontWeight: '600', color: '#B26A00' }}>Menunggu dicek perangkat desa. Belum terlihat warga lain.</Text> : null}
      {p.content ? <Pressable onPress={open} style={{ marginTop: spacing.sm }}><RichText text={p.content} numberOfLines={detail ? undefined : 6} onTag={onTag} /></Pressable> : null}

      {p.photos.length ? <Carousel photos={p.photos} onOpen={open} /> : null}
      {p.youtube ? (
        <Pressable onPress={() => void Linking.openURL(p.youtube!.url)} accessibilityRole="link" accessibilityLabel={`Tonton video: ${p.youtube.title ?? 'YouTube'}`} style={{ marginTop: spacing.sm, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' }}>
          <Image source={{ uri: p.youtube.thumb }} style={{ width: '100%', aspectRatio: 16 / 9, opacity: 0.85 }} contentFit="cover" />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="play-circle" size={64} color="#fff" />
          </View>
          {p.youtube.title ? <Text style={{ color: '#fff', padding: 10, fontSize: 14 }} numberOfLines={2}>{p.youtube.title}</Text> : null}
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: 20 }}>
        <Pressable onPress={() => void toggleLike()} accessibilityRole="button" accessibilityLabel={`${liked ? 'Batal suka' : 'Suka'}, ${likes} suka`} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={26} color={liked ? colors.danger : colors.text} />
          <Text style={{ fontSize: 16, color: colors.text }}>{likes}</Text>
        </Pressable>
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Komentar, ${p.comments}`} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
          <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
          <Text style={{ fontSize: 16, color: colors.text }}>{p.comments}</Text>
        </Pressable>
        <Pressable onPress={() => void shareWa()} accessibilityRole="button" accessibilityLabel="Bagikan ke WhatsApp" hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Ionicons name="share-social-outline" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => void toggleSave()} accessibilityRole="button" accessibilityLabel={saved ? 'Hapus dari simpanan' : 'Simpan'} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={24} color={saved ? colors.primary : colors.text} />
        </Pressable>
      </View>
    </View>
  );
}
