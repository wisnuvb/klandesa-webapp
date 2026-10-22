import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Card, Empty } from '@/components/cards';
import { Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { timeAgoId } from '@/lib/format';
import { useStaffAnnouncements } from '@/lib/queries';
import { colors } from '@/theme';

export default function Pengumuman() {
  const q = useStaffAnnouncements();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: number, active: boolean) {
    setBusy(id);
    setError(null);
    try {
      await api(`/staff/announcements/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      await qc.invalidateQueries({ queryKey: ['staff-announcements'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengubah pengumuman.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching} footer={<Button label="Buat Pengumuman" onPress={() => router.push('/staff/pengumuman/baru')} />}>
      <ErrorBanner message={error} />
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat pengumuman.'} /> : null}
      {q.isSuccess && q.data.items.length === 0 ? <Empty title="Belum ada pengumuman" hint="Tulis pengumuman pertama untuk warga desa." /> : null}
      {q.data?.items.map((a) => (
        <Card key={a.id}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: a.active ? colors.primary : colors.textMuted }}>{a.category.toUpperCase()}{a.pinned ? ' · DISEMATKAN' : ''}{a.active ? '' : ' · DITARIK'}</Text>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{a.title}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={2}>{a.excerpt}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 13, color: colors.textMuted }}>{timeAgoId(a.publishedAt)} · {a.views}x dilihat</Text>
            <Button label={a.active ? 'Tarik' : 'Tampilkan lagi'} variant="link" loading={busy === a.id} onPress={() => void toggle(a.id, !a.active)} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
