import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { Empty } from '@/components/cards';
import { PostCard } from '@/components/post-card';
import { Button, ErrorBanner } from '@/components/ui';
import { ApiError, api, post } from '@/lib/api';
import { timeAgoId } from '@/lib/format';
import { useInvalidateSocial, useSocialComments, useSocialConfig, useSocialPost, type SocialComment } from '@/lib/queries';
import { colors, spacing } from '@/theme';

export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const q = useSocialPost(numId);
  const comments = useSocialComments(numId);
  const cfg = useSocialConfig();
  const invalidate = useInvalidateSocial();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const max = cfg.data?.limits.commentChars ?? 500;

  async function send() {
    const t = text.trim();
    if (!t) return;
    setBusy(true);
    setError(null);
    try {
      await post(`/social/posts/${numId}/comments`, { content: t });
      setText('');
      await qc.invalidateQueries({ queryKey: ['social-comments', numId] });
      invalidate();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim komentar.');
    } finally {
      setBusy(false);
    }
  }

  function commentMenu(c: SocialComment) {
    if (c.author.mine) {
      Alert.alert('Komentar Anda', undefined, [
        { text: 'Hapus', style: 'destructive', onPress: () => void api(`/social/comments/${c.id}`, { method: 'DELETE' }).then(() => { void qc.invalidateQueries({ queryKey: ['social-comments', numId] }); invalidate(); }).catch(() => Alert.alert('Gagal', 'Coba lagi.')) },
        { text: 'Batal', style: 'cancel' },
      ]);
    } else {
      Alert.alert(c.author.name, undefined, [
        { text: 'Laporkan', onPress: () => router.push({ pathname: '/warga/laporkan', params: { targetType: 'comment', targetId: String(c.id) } }) },
        { text: 'Batal', style: 'cancel' },
      ]);
    }
  }

  if (q.isLoading) return <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  if (q.isError || !q.data) {
    return (
      <SafeAreaView style={{ flex: 1, padding: spacing.lg }}>
        <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Postingan tidak ditemukan.'} />
        <Button label="Kembali" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const muted = cfg.data?.muted;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={comments.data?.items ?? []}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: spacing.md }}
          ListHeaderComponent={<View><PostCard p={q.data} detail /><Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted, marginVertical: spacing.sm }}>KOMENTAR</Text></View>}
          ListEmptyComponent={comments.isLoading ? <ActivityIndicator color={colors.primary} /> : <Empty title="Belum ada komentar" hint="Jadilah yang pertama menanggapi." />}
          renderItem={({ item: c }) => (
            <Pressable onLongPress={() => commentMenu(c)} accessibilityHint="Tekan lama untuk laporkan atau hapus" style={{ paddingVertical: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{c.author.name} <Text style={{ fontWeight: '400', color: colors.textMuted, fontSize: 13 }}>· {timeAgoId(c.createdAt)}</Text></Text>
              <Text style={{ fontSize: 16, lineHeight: 23, color: colors.text }}>{c.content}</Text>
            </Pressable>
          )}
        />
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.sm }}>
          <ErrorBanner message={error} />
          {muted ? <Text style={{ padding: 8, color: colors.textMuted }}>Akun Anda sedang dibisukan.</Text> : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <TextInput value={text} onChangeText={setText} placeholder="Tulis komentar…" placeholderTextColor={colors.textMuted} multiline maxLength={max} accessibilityLabel="Komentar"
                style={{ flex: 1, maxHeight: 110, minHeight: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 17, color: colors.text, backgroundColor: colors.surface }} />
              <View style={{ width: 96 }}><Button label="Kirim" loading={busy} disabled={!text.trim()} onPress={() => void send()} /></View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
