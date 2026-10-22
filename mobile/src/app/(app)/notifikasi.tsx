import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { Card, Empty } from '@/components/cards';
import { Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { timeAgoId } from '@/lib/format';
import { useMarkRead, useNotifications, type NotificationRow } from '@/lib/queries';
import { colors } from '@/theme';

export default function Notifikasi() {
  const q = useNotifications();
  const mark = useMarkRead();
  const items = q.data?.items ?? [];
  const hasUnread = items.some((n) => !n.read);

  function open(n: NotificationRow) {
    if (!n.read) mark.mutate({ ids: [n.id] });
    if (n.deepLink?.startsWith('/')) router.push(n.deepLink as never);
  }

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {hasUnread ? <Button label="Tandai semua sudah dibaca" variant="link" onPress={() => mark.mutate({ all: true })} /> : null}
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat notifikasi.'} /> : null}
      {q.isSuccess && items.length === 0 ? <Empty title="Belum ada notifikasi" hint="Kabar tentang surat dan laporan Anda akan muncul di sini." /> : null}
      {items.map((n) => (
        <Card key={n.id} onPress={() => open(n)} label={`${n.read ? '' : 'Baru. '}${n.title}`}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, marginTop: 7, backgroundColor: n.read ? 'transparent' : colors.primary }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: n.read ? '500' : '700', color: colors.text }}>{n.title}</Text>
              {n.body ? <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 2 }} numberOfLines={3}>{n.body}</Text> : null}
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>{timeAgoId(n.createdAt)}</Text>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
