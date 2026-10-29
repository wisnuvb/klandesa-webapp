import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/text';
import { useQueryClient } from '@tanstack/react-query';

import { Avatar, EmptyState, InfoBox } from '@/components/cards';
import { ErrorBanner, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { useBlocks, useInvalidateSocial } from '@/lib/queries';
import { Pressable } from 'react-native';
import { colors, shadow, spacing } from '@/theme';

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
    <Screen background={colors.canvas}>
      <InfoBox>Akun yang Anda blokir tidak tampil di Warga. Anda bisa membuka blokirnya kapan saja.</InfoBox>
      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat.'} /> : null}
      {q.isSuccess && q.data.items.length === 0 ? <View style={{ marginTop: spacing.md }}><EmptyState icon="happy-outline" title="Tidak ada akun yang diblokir" hint="Akun yang Anda blokir akan tampil di sini." /></View> : null}
      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {q.data?.items.map((b) => (
          <View key={`${b.accountType}${b.accountId}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadow.card }}>
            <Avatar name={b.name} />
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.text }}>{b.name}</Text>
            <Pressable onPress={() => void unblock(b.accountId)} accessibilityRole="button" accessibilityLabel={`Buka blokir ${b.name}`} style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.primarySoft, justifyContent: 'center' }, pressed && { opacity: 0.8 }]}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.primary }}>Buka blokir</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}
