import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Chip, EmptyState, SectionHeader } from '@/components/cards';
import { PostCard } from '@/components/post-card';
import { PostSkeleton } from '@/components/skeleton';
import { ErrorBanner } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuthorPosts } from '@/lib/queries';
import { colors, shadow, spacing } from '@/theme';

export default function AuthorProfile() {
  const { id, type, name, rt } = useLocalSearchParams<{ id: string; type?: string; name?: string; rt?: string }>();
  const q = useAuthorPosts(type ?? 'citizen', Number(id));
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const author = q.data?.pages[0]?.author;
  const displayName = author?.name ?? name ?? 'Warga';
  const displayRt = author?.rt ?? rt ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => void q.refetch()}
        onEndReachedThreshold={0.6}
        onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }}
        ListHeaderComponent={
          <View style={{ padding: 12, paddingBottom: 0 }}>
            <View style={{ alignItems: 'center', backgroundColor: colors.bg, borderRadius: 24, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.lg, paddingHorizontal: spacing.md, marginBottom: 4, ...shadow.card }}>
              <Avatar name={displayName} size={84} tone="deep" />
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.sm, textAlign: 'center' }} accessibilityRole="header">{displayName}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' }}>
                {type === 'staff' ? <Chip label="Perangkat Desa" tone="green" icon="shield-checkmark" /> : null}
                {displayRt ? <Chip label={`RT ${displayRt}`} tone="green" icon="home-outline" /> : null}
                {author ? <Chip label={`${author.postsCount} postingan`} icon="document-text-outline" /> : null}
              </View>
            </View>
            {q.isError ? <View style={{ marginTop: spacing.md }}><ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat profil.'} /></View> : null}
            <SectionHeader>Postingan</SectionHeader>
          </View>
        }
        renderItem={({ item }) => <PostCard p={item} />}
        ListEmptyComponent={q.isLoading ? <PostSkeleton /> : <View style={{ paddingHorizontal: 12 }}><EmptyState icon="chatbubble-outline" title="Belum ada postingan" hint="Warga ini belum membagikan apa pun di Warga." /></View>}
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ margin: 16 }} /> : undefined}
      />
    </SafeAreaView>
  );
}
