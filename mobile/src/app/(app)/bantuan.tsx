import { ActivityIndicator, Linking, Text } from 'react-native';

import { Card, Empty, SectionTitle } from '@/components/cards';
import { Body, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useBenefits } from '@/lib/queries';
import { colors } from '@/theme';

export default function Bantuan() {
  const q = useBenefits();
  const d = q.data;
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Body muted>Program bantuan yang tercatat atas nama Anda di catatan desa.</Body>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError && !d ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat data bantuan.'} /> : null}
      {d && d.entries.length === 0 ? <Empty title="Belum ada program yang tercatat" hint="Ini bukan berarti Anda tidak berhak. Tanyakan syaratnya ke RT atau kantor desa." /> : null}
      {d?.entries.map((e) => (
        <Card key={e.id} label={`${e.programName}. ${e.summary}`}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{e.programName}</Text>
          {e.periodLabel ? <Text style={{ fontSize: 14, color: colors.textMuted }}>{e.periodLabel}</Text> : null}
          <Text style={{ fontSize: 15, color: colors.text, marginTop: 6 }}>{e.summary}</Text>
        </Card>
      ))}
      {d ? (
        <>
          <SectionTitle>CEK DI SUMBER RESMI</SectionTitle>
          {d.nationalResources.map((r) => (
            <Card key={r.href} onPress={() => void Linking.openURL(r.href)} label={`${r.title}. Buka tautan resmi`}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>{r.title}</Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{r.description}</Text>
            </Card>
          ))}
          {d.disclaimers.map((t) => <Body key={t} muted>{t}</Body>)}
        </>
      ) : null}
    </Screen>
  );
}
