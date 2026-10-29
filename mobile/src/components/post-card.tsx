import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Alert, Animated, FlatList, Linking, Pressable, Share, View, type LayoutChangeEvent } from 'react-native';
import { Text } from '@/components/text';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Avatar } from '@/components/cards';
import { ApiError, api, post } from '@/lib/api';
import { EMBED } from '@/lib/embed';
import { timeAgoId } from '@/lib/format';
import { trackHide, trackOpen, trackShare } from '@/lib/social-signals';
import type { FeedSrc } from '@/lib/social-signals-logic';
import { useInvalidateSocial, type SocialPost } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

const CATEGORY_LABEL: Record<string, string> = { kegiatan: 'Kegiatan', usaha: 'Usaha', info: 'Info', lainnya: 'Lainnya' };
/** Latar lembut untuk postingan teks pendek; dipilih tetap menurut id agar tidak berganti saat dimuat ulang. */
const TEXT_TINTS = [colors.primarySoft, colors.goldSoft, '#E8F0FB', '#F6EEF7'];
const TEXT_PANEL_MAX = 140;

/** Pecah teks menjadi bagian biasa dan #hashtag berwarna (ketuk hashtag mencari). */
function withTags(text: string, onTag?: (tag: string) => void): ReactNode[] {
  return text.split(/(#[\p{L}\p{N}_]{2,30})/gu).map((p, i) => p.startsWith('#') && p.length > 2
    ? <Text key={i} style={{ color: colors.primary, fontWeight: '600' }} onPress={() => onTag?.(p)}>{p}</Text>
    : p);
}

/** Hati putih besar yang muncul sekejap di tengah media saat diketuk dua kali. */
function Burst({ value }: { value: Animated.Value }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center',
        opacity: value.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
        transform: [{ scale: value.interpolate({ inputRange: [0, 0.2, 0.4, 1], outputRange: [0.4, 1.25, 1, 1.05] }) }],
      }}
    >
      <Ionicons name="heart" size={104} color="#fff" style={{ textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 14 }} />
    </Animated.View>
  );
}

/** Foto tegak 4:5 seperti Instagram: lebih lega untuk wajah dan kegiatan, dan tetap muat di layar HP kecil. */
const MEDIA_RATIO = 4 / 5;

function Photos({ photos, idx, onIdx, onTap, burst }: { photos: string[]; idx: number; onIdx: (i: number) => void; onTap: () => void; burst: Animated.Value }) {
  const [w, setW] = useState(0);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ width: '100%', aspectRatio: MEDIA_RATIO, backgroundColor: colors.surface }}>
      {w > 0 ? (
        <FlatList
          horizontal pagingEnabled showsHorizontalScrollIndicator={false} data={photos} keyExtractor={(u) => u}
          onMomentumScrollEnd={(e) => onIdx(Math.round(e.nativeEvent.contentOffset.x / w))}
          renderItem={({ item }) => (
            <Pressable onPress={onTap} accessibilityRole="imagebutton" accessibilityLabel="Foto postingan. Ketuk dua kali untuk menyukai.">
              <Image source={{ uri: item }} style={{ width: w, height: w / MEDIA_RATIO }} contentFit="cover" transition={150} />
            </Pressable>
          )}
        />
      ) : null}
      {photos.length > 1 ? (
        <View pointerEvents="none" style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(12,20,16,0.6)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }} accessibilityLabel={`Foto ${idx + 1} dari ${photos.length}`}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{idx + 1}/{photos.length}</Text>
        </View>
      ) : null}
      {photos.length > 1 ? (
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {photos.map((_, i) => <View key={i} style={{ width: i === idx ? 8 : 6, height: i === idx ? 8 : 6, borderRadius: 4, backgroundColor: i === idx ? '#fff' : 'rgba(255,255,255,0.55)' }} />)}
        </View>
      ) : null}
      <Burst value={burst} />
    </View>
  );
}

/** Kartu tautan: YouTube menampilkan thumbnail; TikTok/Facebook/X ubin gelap berlogo. Diputar di aplikasi aslinya, bukan di sini. */
function LinkCard({ link }: { link: NonNullable<SocialPost['link']> }) {
  const meta = EMBED[link.provider];
  const open = () => void Linking.openURL(link.url).catch(() => Alert.alert('Tidak bisa dibuka', 'Tautan ini tidak bisa dibuka di perangkat Anda.'));
  const label = `${meta.action}${link.title ? `: ${link.title}` : ''}`;
  if (link.provider === 'youtube' && link.thumb) {
    return (
      <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={label} style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }}>
        <Image source={{ uri: link.thumb }} style={{ width: '100%', height: '100%', opacity: 0.88 }} contentFit="cover" />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="play-circle" size={68} color="#fff" />
        </View>
        <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(12,20,16,0.6)', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 }}>
          <Ionicons name={meta.icon} size={15} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{meta.label}</Text>
        </View>
        {link.title ? <Text style={{ position: 'absolute', left: 0, right: 0, bottom: 0, color: '#fff', backgroundColor: 'rgba(12,20,16,0.55)', paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontWeight: '600' }} numberOfLines={2}>{link.title}</Text> : null}
      </Pressable>
    );
  }
  return (
    <Pressable onPress={open} accessibilityRole="link" accessibilityLabel={label} style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: '#101418', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 30 }}>
      <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={meta.icon} size={30} color="#fff" />
      </View>
      <Text style={{ color: '#fff', fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center', marginTop: 12 }} numberOfLines={2}>{link.title ?? `Postingan ${meta.label}`}</Text>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{meta.action}</Text>
        <Ionicons name="open-outline" size={14} color="#fff" />
      </View>
    </Pressable>
  );
}

/**
 * Tombol aksi berlabel kata ("Suka", "Komentar", "Bagikan") seperti Facebook: warga yang belum hafal ikon tetap paham.
 * Jumlahnya tampil di baris teks di bawah kartu, bukan di tombol.
 */
function ActionButton({ onPress, label, text, color, children }: { onPress: () => void; label: string; text?: string; color?: string; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={({ pressed }) => [{ minHeight: 48, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }, pressed && { opacity: 0.6 }]}>
      {children}
      {text ? <Text style={{ fontSize: 14.5, fontWeight: '600', color: color ?? colors.text }}>{text}</Text> : null}
    </Pressable>
  );
}

/** Ikon WhatsApp dengan hijau yang cukup kontras di atas putih (hijau resmi #25D366 terlalu pucat). */
const WA_GREEN = '#128C7E';

export function PostCard({ p, detail, onTag, src }: { p: SocialPost; detail?: boolean; onTag?: (tag: string) => void; /** Dari tab mana kartu ini dilihat; dipakai pencatat sinyal dan menu "Kurangi". */ src?: FeedSrc }) {
  const [liked, setLiked] = useState(p.liked);
  const [likes, setLikes] = useState(p.likes);
  const [saved, setSaved] = useState(p.saved);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dimmed, setDimmed] = useState(false);
  const [idx, setIdx] = useState(0);
  const [pop] = useState(() => new Animated.Value(1));
  const [burst] = useState(() => new Animated.Value(0));
  const lastTap = useRef(0);
  const invalidate = useInvalidateSocial();
  const viewerIsStaff = useSession().profile?.account.type === 'staff';
  const authorIsStaff = p.author.type === 'staff';

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    if (next) Animated.sequence([Animated.timing(pop, { toValue: 1.3, duration: 110, useNativeDriver: true }), Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true })]).start();
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
    if (src) trackShare(p.id, src);
    const text = `${p.author.name} di Warga Klandesa:\n\n${p.content.slice(0, 280)}${p.content.length > 280 ? '…' : ''}${p.link ? `\n${p.link.url}` : ''}\n\nBuka aplikasi Klandesa untuk melihat selengkapnya.`;
    const wa = `whatsapp://send?text=${encodeURIComponent(text)}`;
    if (await Linking.canOpenURL(wa).catch(() => false)) void Linking.openURL(wa);
    else void Share.share({ message: text });
  }
  async function del() {
    try { await api(`/social/posts/${p.id}`, { method: 'DELETE' }); invalidate(); if (detail) router.back(); }
    catch (e) { Alert.alert('Gagal', e instanceof ApiError ? e.message : 'Coba lagi.'); }
  }
  async function block() {
    try { await post('/social/blocks', { accountId: p.author.id, accountType: p.author.type, blocked: true }); invalidate(); if (detail) router.back(); Alert.alert('Diblokir', `Postingan ${p.author.name} tidak akan tampil lagi. Bisa dibuka di Saya → Akun diblokir.`); }
    catch (e) { Alert.alert('Gagal', e instanceof ApiError ? e.message : 'Coba lagi.'); }
  }
  const openProfile = () => router.push({ pathname: '/warga/profil/[id]', params: { id: String(p.author.id), type: p.author.type, name: p.author.name, rt: p.author.rt ?? '' } });
  const open = () => {
    if (detail) return;
    if (src) trackOpen(p.id, src);
    router.push(`/warga/${p.id}`);
  };
  const explain = () => Alert.alert(
    'Kenapa saya melihat ini?',
    `${p.why?.label ?? 'Postingan ini termasuk yang baru dari warga desa'}.\n\n"Untuk Anda" memilih dari yang pernah Anda sukai, buka, simpan, atau bagikan. Tab "Terbaru" selalu menampilkan semuanya urut waktu.`,
    [{ text: 'Atur minat saya', onPress: () => router.push('/warga/minat') }, { text: 'Tutup', style: 'cancel' }],
  );
  function dim(on: boolean) {
    setDimmed(on);
    if (src) trackHide(p.id, src, on);
  }

  /** Ketuk dua kali pada media = suka (seperti Instagram); ketuk sekali membuka detail. */
  function tapMedia() {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      burst.setValue(0);
      Animated.timing(burst, { toValue: 1, duration: 750, useNativeDriver: true }).start();
      if (!liked) void toggleLike();
      return;
    }
    lastTap.current = now;
    if (!detail) setTimeout(() => { if (lastTap.current === now) { lastTap.current = 0; open(); } }, 310);
  }

  const actions: SheetAction[] = p.mine
    ? [
        ...(p.canEdit ? [{ icon: 'create-outline' as const, label: 'Edit tulisan', caption: 'Hanya bisa dalam 15 menit pertama', onPress: () => router.push({ pathname: '/warga/baru', params: { editId: String(p.id), text: p.content } }) }] : []),
        { icon: 'trash-outline', label: 'Hapus postingan', danger: true, onPress: () => Alert.alert('Hapus postingan?', 'Tidak bisa dikembalikan.', [{ text: 'Batal', style: 'cancel' }, { text: 'Hapus', style: 'destructive', onPress: () => void del() }]) },
      ]
    : [
        ...(src === 'forYou' ? [{ icon: 'eye-off-outline' as const, label: 'Kurangi yang seperti ini', caption: 'Lebih jarang tampil di Untuk Anda', onPress: () => dim(true) }] : []),
        ...(p.why ? [{ icon: 'help-circle-outline' as const, label: 'Kenapa saya melihat ini?', onPress: explain }] : []),
        { icon: 'person-outline', label: `Lihat profil ${p.author.name}`, onPress: openProfile },
        { icon: 'flag-outline', label: 'Laporkan postingan', caption: 'Melanggar aturan komunitas', onPress: () => router.push({ pathname: '/warga/laporkan', params: { targetType: 'post', targetId: String(p.id) } }) },
        // Akun resmi perangkat desa tidak bisa diblokir, dan perangkat desa tidak memblokir (mereka memoderasi).
        ...(authorIsStaff || viewerIsStaff ? [] : [{ icon: 'ban-outline' as const, label: `Blokir ${p.author.name}`, caption: 'Postingannya tidak akan tampil lagi', danger: true, onPress: () => void block() }]),
      ];

  const meta = [authorIsStaff ? 'Perangkat Desa' : p.author.rt ? `RT ${p.author.rt}` : null, CATEGORY_LABEL[p.category] ?? p.category].filter(Boolean).join(' · ');
  const textPanel = !p.photos.length && !p.link && p.content.length > 0 && p.content.length <= TEXT_PANEL_MAX;
  const captionLong = p.content.length > 110 || (p.content.match(/\n/g)?.length ?? 0) >= 2;
  const showCaption = p.content.length > 0 && !textPanel;

  if (dimmed) {
    return (
      <View style={{ backgroundColor: colors.bg, marginBottom: 8, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Ionicons name="eye-off-outline" size={24} color={colors.textMuted} />
        <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: colors.textMuted }}>Baik. Postingan seperti ini akan lebih jarang muncul di Untuk Anda. Tetap ada di tab Terbaru.</Text>
        <Pressable onPress={() => dim(false)} accessibilityRole="button" accessibilityLabel="Batalkan, tampilkan lagi" style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.primarySoft, justifyContent: 'center' }, pressed && { opacity: 0.8 }]}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>Batal</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.bg, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 }}>
        <Pressable onPress={openProfile} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }} accessibilityRole="button" accessibilityLabel={`Lihat profil ${p.author.name}`}>
          <Avatar name={p.author.name} size={36} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ flexShrink: 1, fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>{p.author.name}</Text>
              {authorIsStaff ? <Ionicons name="checkmark-circle" size={16} color={colors.primary} accessibilityLabel="Akun resmi perangkat desa" /> : null}
            </View>
            {meta ? <Text style={{ fontSize: 12.5, color: colors.textMuted, marginTop: 1 }} numberOfLines={1}>{meta}</Text> : null}
            {p.why && src === 'forYou' ? (
              <Text onPress={explain} accessibilityRole="button" accessibilityLabel={`${p.why.label}. Ketuk untuk penjelasan.`} style={{ fontSize: 12.5, fontWeight: '600', color: colors.goldText, marginTop: 1 }} numberOfLines={1}>{p.why.label}</Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable onPress={() => setMenuOpen(true)} accessibilityRole="button" accessibilityLabel="Menu postingan" hitSlop={8} style={({ pressed }) => [{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.6 }]}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </Pressable>
      </View>

      {p.pending ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginHorizontal: 12, marginBottom: 8, backgroundColor: colors.goldSoft, borderRadius: 12, padding: 10 }}>
          <Ionicons name="time-outline" size={18} color={colors.goldText} />
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.goldText }}>Menunggu dicek perangkat desa. Belum terlihat warga lain.</Text>
        </View>
      ) : null}

      {p.photos.length ? <Photos photos={p.photos} idx={idx} onIdx={setIdx} onTap={tapMedia} burst={burst} /> : null}
      {p.link ? <LinkCard link={p.link} /> : null}
      {textPanel ? (
        <Pressable onPress={tapMedia} accessibilityLabel={`${p.content}. Ketuk dua kali untuk menyukai.`} style={{ minHeight: 220, backgroundColor: TEXT_TINTS[p.id % TEXT_TINTS.length], alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32 }}>
          <Text style={{ fontSize: 20, lineHeight: 29, fontWeight: '700', color: colors.text, textAlign: 'center' }}>{withTags(p.content, onTag)}</Text>
          <Burst value={burst} />
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 4, paddingTop: 2 }}>
        <ActionButton onPress={() => void toggleLike()} label={`${liked ? 'Batal suka' : 'Suka'}, ${likes} suka`} text="Suka" color={liked ? colors.danger : undefined}>
          <Animated.View style={{ transform: [{ scale: pop }] }}><Ionicons name={liked ? 'heart' : 'heart-outline'} size={27} color={liked ? colors.danger : colors.text} /></Animated.View>
        </ActionButton>
        <ActionButton onPress={open} label={`Komentar, ${p.comments}`} text="Komentar">
          <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
        </ActionButton>
        <ActionButton onPress={() => void shareWa()} label="Bagikan lewat WhatsApp" text="Bagikan" color={WA_GREEN}>
          <Ionicons name="logo-whatsapp" size={25} color={WA_GREEN} />
        </ActionButton>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => void toggleSave()} accessibilityRole="button" accessibilityLabel={saved ? 'Hapus dari simpanan' : 'Simpan'} hitSlop={4} style={({ pressed }) => [{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.6 }]}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={25} color={saved ? colors.primary : colors.text} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        {likes > 0 ? <Text style={{ fontSize: 14.5, fontWeight: '700', color: colors.text, marginTop: 2 }}>Disukai {likes} warga</Text> : null}
        {showCaption ? (
          <View style={{ marginTop: 4 }}>
            <Pressable onPress={open} disabled={detail}>
              <Text style={{ fontSize: 15, lineHeight: 22, color: colors.text }} numberOfLines={detail ? undefined : 2}>
                <Text style={{ fontWeight: '700' }} onPress={openProfile}>{p.author.name} </Text>
                {withTags(p.content, onTag)}
              </Text>
            </Pressable>
            {captionLong && !detail ? <Pressable onPress={open} hitSlop={6} style={{ alignSelf: 'flex-start', paddingVertical: 3 }}><Text style={{ fontSize: 14, color: colors.textMuted }}>selengkapnya</Text></Pressable> : null}
          </View>
        ) : null}
        {!detail && p.comments > 0 ? (
          <Pressable onPress={open} hitSlop={4} style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>Lihat semua {p.comments} komentar</Text>
          </Pressable>
        ) : null}
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: spacing.xs }}>{timeAgoId(p.createdAt)}{p.editedAt ? ' · diedit' : ''}</Text>
      </View>

      <ActionSheet visible={menuOpen} title={p.mine ? 'Postingan Anda' : p.author.name} subtitle={p.mine ? undefined : meta} actions={actions} onClose={() => setMenuOpen(false)} />
    </View>
  );
}
