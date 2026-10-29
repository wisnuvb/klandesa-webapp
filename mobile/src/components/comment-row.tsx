import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/text';

import { Avatar } from '@/components/cards';
import { post } from '@/lib/api';
import { timeAgoId } from '@/lib/format';
import type { SocialComment } from '@/lib/queries';
import { colors } from '@/theme';

export function CommentRow({ c, onMenu }: { c: SocialComment; onMenu: () => void }) {
  const [liked, setLiked] = useState(c.liked);
  const [likes, setLikes] = useState(c.likes);

  async function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      const r = await post<{ liked: boolean; likes: number }>(`/social/comments/${c.id}/like`, { liked: next });
      setLikes(r.likes);
    } catch {
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
    }
  }
  const openProfile = () => router.push({ pathname: '/warga/profil/[id]', params: { id: String(c.author.id), type: c.author.type, name: c.author.name } });

  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
      <Pressable onPress={openProfile} accessibilityRole="button" accessibilityLabel={`Lihat profil ${c.author.name}`} hitSlop={4}>
        <Avatar name={c.author.name} size={38} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: colors.bg, borderRadius: 18, borderTopLeftRadius: 6, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Pressable onPress={openProfile} style={{ flexShrink: 1 }}><Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }} numberOfLines={1}>{c.author.name}{c.author.type === 'staff' ? ' ✓' : ''}</Text></Pressable>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>{timeAgoId(c.createdAt)}</Text>
          </View>
          <Text style={{ fontSize: 16, lineHeight: 23, color: colors.text, marginTop: 3 }}>{c.content}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Pressable onPress={() => void toggleLike()} accessibilityRole="button" accessibilityLabel={`${liked ? 'Batal suka' : 'Suka'}, ${likes} suka`} hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40, paddingHorizontal: 8 }}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={19} color={liked ? colors.danger : colors.textMuted} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: liked ? colors.danger : colors.textMuted }}>{likes > 0 ? `Suka · ${likes}` : 'Suka'}</Text>
          </Pressable>
          <Pressable onPress={onMenu} accessibilityRole="button" accessibilityLabel={c.author.mine ? 'Menu komentar Anda' : `Menu komentar ${c.author.name}`} hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingHorizontal: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={19} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
