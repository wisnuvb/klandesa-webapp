import { ActivityIndicator, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Card, Empty } from '@/components/cards';
import { Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { useBlocks, useInvalidateSocial } from '@/lib/queries';
import { colors } from '@/theme';

export default function Diblokir() {
  const q = useBlocks();
  const qc = useQueryClient();
  const invalidate = useInvalidateSocial();
  async function unblock(id: number) {
    await post('/social/blocks', { accountId: id, blocked: false }).catch(() => undefined);
    await qc.invalidateQueries({ queryKey: ['social-blocks'] });
    invalidate();
  }
  return (
    <Screen>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat.'} /> : null}
      {q.isSuccess && q.data.items.length === 0 ? <Empty title="Tidak ada akun yang diblokir" /> : null}
      {q.data?.items.map((b) => (
        <Card key={`${b.accountType}${b.accountId}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.text }}>{b.name}</Text>
            <Button label="Buka blokir" variant="link" onPress={() => void unblock(b.accountId)} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
