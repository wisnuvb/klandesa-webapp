import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/text';

import { EmptyState, SectionHeader } from '@/components/cards';
import { ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { timeAgoId } from '@/lib/format';
import { useMarkRead, useNotifications, type NotificationRow } from '@/lib/queries';
import { colors, shadow, spacing } from '@/theme';

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  mail_status: 'document-text',
  report_status: 'megaphone',
  announcement: 'newspaper',
  data_change: 'create',
  system: 'information-circle',
};

function Row({ n, first, onPress }: { n: NotificationRow; first: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${n.read ? '' : 'Baru. '}${n.title}. ${timeAgoId(n.createdAt)}`}
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderTopWidth: first ? 0 : 1, borderTopColor: colors.surface, backgroundColor: n.read ? colors.bg : '#F3FAF6' }, pressed && { backgroundColor: colors.surface }]}
    >
      <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: n.read ? colors.surface : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={ICON[n.type] ?? 'notifications'} size={22} color={n.read ? colors.textMuted : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: n.read ? '600' : '800', color: colors.text }}>{n.title}</Text>
        {n.body ? <Text style={{ fontSize: 15, lineHeight: 21, color: colors.textMuted, marginTop: 2 }} numberOfLines={3}>{n.body}</Text> : null}
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>{timeAgoId(n.createdAt)}</Text>
      </View>
      {!n.read ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 }} /> : null}
    </Pressable>
  );
}

function Group({ items, onOpen }: { items: NotificationRow[]; onOpen: (n: NotificationRow) => void }) {
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }}>
      {items.map((n, i) => <Row key={n.id} n={n} first={i === 0} onPress={() => onOpen(n)} />)}
    </View>
  );
}

export default function Notifikasi() {
  const q = useNotifications();
  const mark = useMarkRead();
  const items = q.data?.items ?? [];
  const unread = items.filter((n) => !n.read);
  const older = items.filter((n) => n.read);

  function open(n: NotificationRow) {
    if (!n.read) mark.mutate({ ids: [n.id] });
    if (n.deepLink?.startsWith('/')) router.push(n.deepLink as never);
  }

  return (
    <Screen background={colors.canvas} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat notifikasi.'} /> : null}
      {q.isSuccess && items.length === 0 ? <EmptyState icon="notifications-outline" title="Belum ada notifikasi" hint="Kabar tentang surat dan laporan Anda akan muncul di sini." /> : null}

      {unread.length ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <SectionHeader>{`Belum dibaca (${unread.length})`}</SectionHeader>
            <Pressable onPress={() => mark.mutate({ all: true })} accessibilityRole="button" accessibilityLabel="Tandai semua sudah dibaca" hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', marginBottom: -4 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>Tandai dibaca</Text>
            </Pressable>
          </View>
          <Group items={unread} onOpen={open} />
        </>
      ) : null}
      {older.length ? (
        <>
          <SectionHeader>{unread.length ? 'Sebelumnya' : 'Semua notifikasi'}</SectionHeader>
          <Group items={older} onOpen={open} />
        </>
      ) : null}
    </Screen>
  );
}
