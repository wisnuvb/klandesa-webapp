import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { ActionSheet, type SheetAction } from '@/components/action-sheet';
import { Avatar, EmptyState, InfoBox, SectionHeader } from '@/components/cards';
import { CommentRow } from '@/components/comment-row';
import { PostCard } from '@/components/post-card';
import { PostSkeleton } from '@/components/skeleton';
import { Button, ErrorBanner, useKeyboardVisible } from '@/components/ui';
import { ApiError, api, post } from '@/lib/api';
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
  const keyboard = useKeyboardVisible();
  const listRef = useRef<FlatList<SocialComment>>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<SocialComment | null>(null);
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
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 250);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim komentar.');
    } finally {
      setBusy(false);
    }
  }

  function commentActions(c: SocialComment): SheetAction[] {
    if (c.author.mine) {
      return [{
        icon: 'trash-outline', label: 'Hapus komentar', danger: true,
        onPress: () => void api(`/social/comments/${c.id}`, { method: 'DELETE' })
          .then(() => { void qc.invalidateQueries({ queryKey: ['social-comments', numId] }); invalidate(); })
          .catch(() => Alert.alert('Gagal', 'Coba lagi.')),
      }];
    }
    return [
      { icon: 'person-outline', label: `Lihat profil ${c.author.name}`, onPress: () => router.push({ pathname: '/warga/profil/[id]', params: { id: String(c.author.id), type: c.author.type, name: c.author.name } }) },
      { icon: 'flag-outline', label: 'Laporkan komentar', caption: 'Melanggar aturan komunitas', onPress: () => router.push({ pathname: '/warga/laporkan', params: { targetType: 'comment', targetId: String(c.id) } }) },
    ];
  }

  if (q.isLoading) return <View style={{ flex: 1, backgroundColor: colors.canvas }}><PostSkeleton /></View>;
  if (q.isError || !q.data) {
    return (
      <SafeAreaView style={{ flex: 1, padding: spacing.lg, backgroundColor: colors.canvas }}>
        <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Postingan tidak ditemukan.'} />
        <Button label="Kembali" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const muted = cfg.data?.muted;
  const left = max - text.length;
  const canSend = !!text.trim() && !busy;
  return (
    // Android edge-to-edge tidak menyusutkan layar saat keyboard muncul, jadi 'padding' dipakai di kedua platform (sama seperti Screen).
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={keyboard ? [] : ['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <FlatList
          ref={listRef}
          data={comments.data?.items ?? []}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListHeaderComponent={<View><PostCard p={q.data} detail /><View style={{ paddingHorizontal: 12 }}><SectionHeader>{`Komentar${q.data.comments ? ` (${q.data.comments})` : ''}`}</SectionHeader></View></View>}
          ListEmptyComponent={<View style={{ paddingHorizontal: 12 }}>{comments.isLoading ? <ActivityIndicator color={colors.primary} style={{ margin: spacing.md }} /> : <EmptyState icon="chatbubbles-outline" title="Belum ada komentar" hint="Jadilah yang pertama menanggapi." />}</View>}
          renderItem={({ item: c }) => <View style={{ paddingHorizontal: 12 }}><CommentRow c={c} onMenu={() => setMenuFor(c)} /></View>}
        />
        <View style={{ backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 }}>
          <ErrorBanner message={error} />
          {muted ? (
            <InfoBox>Akun Anda sedang dibisukan. Anda masih bisa membaca.</InfoBox>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <View style={{ paddingBottom: 3 }}><Avatar name={cfg.data?.me.name ?? '?'} size={38} tone="deep" /></View>
              <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 16 }}>
                <TextInput
                  value={text} onChangeText={setText} placeholder="Tulis komentar…" placeholderTextColor={colors.placeholder}
                  multiline maxLength={max} accessibilityLabel="Komentar" textAlignVertical="center"
                  style={{ maxHeight: 120, minHeight: 44, paddingVertical: 10, fontSize: 16, lineHeight: 22, color: colors.text }}
                />
                {left <= 80 ? <Text style={{ alignSelf: 'flex-end', fontSize: 11, color: left <= 20 ? colors.danger : colors.textMuted, marginBottom: 4 }}>{left}</Text> : null}
              </View>
              <Pressable
                onPress={() => void send()} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Kirim komentar" accessibilityState={{ disabled: !canSend, busy }}
                style={({ pressed }) => [{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: canSend ? colors.primary : colors.border }, pressed && canSend && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 2 }} />}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      <ActionSheet
        visible={!!menuFor} title={menuFor?.author.mine ? 'Komentar Anda' : menuFor?.author.name} actions={menuFor ? commentActions(menuFor) : []}
        onClose={() => setMenuFor(null)}
      />
    </SafeAreaView>
  );
}
