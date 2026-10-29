import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Linking, Text, View } from 'react-native';

import { Card, Chip, EmptyState, MenuGroup, SectionHeader } from '@/components/cards';
import { ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useBenefits } from '@/lib/queries';
import { colors, spacing } from '@/theme';

export default function Bantuan() {
  const q = useBenefits();
  const d = q.data;
  return (
    <Screen background={colors.canvas} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Text style={{ fontSize: 16, lineHeight: 23, color: colors.textMuted }}>Program bantuan yang tercatat atas nama Anda di catatan desa.</Text>
      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
      {q.isError && !d ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat data bantuan.'} /> : null}

      {d ? (
        <>
          <SectionHeader>Bantuan yang tercatat</SectionHeader>
          {d.entries.length === 0 ? (
            <EmptyState icon="gift-outline" title="Belum ada program yang tercatat" hint="Ini bukan berarti Anda tidak berhak. Tanyakan syaratnya ke RT atau kantor desa." />
          ) : (
            d.entries.map((e) => (
              <Card key={e.id} label={`${e.programName}. ${e.summary}`}>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="gift" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{e.programName}</Text>
                    {e.periodLabel ? <View style={{ marginTop: 4 }}><Chip label={e.periodLabel} /></View> : null}
                    <Text style={{ fontSize: 15, lineHeight: 21, color: colors.text, marginTop: 6 }}>{e.summary}</Text>
                  </View>
                </View>
              </Card>
            ))
          )}

          {d.nationalResources.length ? (
            <>
              <SectionHeader>Cek di sumber resmi</SectionHeader>
              <MenuGroup
                items={d.nationalResources.map((r) => ({ icon: 'globe-outline' as const, title: r.title, caption: r.description, external: true, onPress: () => void Linking.openURL(r.href) }))}
              />
            </>
          ) : null}

          {d.disclaimers.length ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, backgroundColor: colors.goldSoft, borderRadius: 16, padding: spacing.md }}>
              <Ionicons name="information-circle-outline" size={22} color={colors.goldText} />
              <View style={{ flex: 1, gap: 6 }}>
                {d.disclaimers.map((t) => <Text key={t} style={{ fontSize: 15, lineHeight: 21, color: colors.goldText }}>{t}</Text>)}
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
