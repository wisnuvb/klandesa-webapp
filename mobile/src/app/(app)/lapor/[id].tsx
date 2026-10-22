import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { STAGE_COLOR } from '@/components/cards';
import { ContactVillageButton } from '@/components/contact';
import { Body, Button, ErrorBanner, Screen, Title } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId, timeAgoId } from '@/lib/format';
import { useReport, useReportFeedback, type Step } from '@/lib/queries';
import { colors, spacing } from '@/theme';

const MARK: Record<Step['state'], string> = { done: '●', current: '◐', todo: '○', failed: '✕' };
const MARK_COLOR: Record<Step['state'], string> = { done: colors.primary, current: '#B26A00', todo: colors.textMuted, failed: colors.danger };

export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const q = useReport(numId);
  const fb = useReportFeedback(numId);

  if (q.isLoading) return <Screen><ActivityIndicator color={colors.primary} /></Screen>;
  if (q.isError || !q.data) {
    return (
      <Screen>
        <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat laporan.'} />
        <Button label="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </Screen>
    );
  }
  const r = q.data;

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{r.category.toUpperCase()}</Text>
      <Title>{r.title}</Title>
      <Body muted>Dikirim {formatDateId(r.createdAt)}{r.locationNote ? ` · ${r.locationNote}` : ''}</Body>

      <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: STAGE_COLOR[r.stage] }}>{r.stageTitle}</Text>
        <Text style={{ fontSize: 16, color: colors.text, marginTop: 6, lineHeight: 23 }}>{r.next}</Text>
      </View>

      {r.canGiveFeedback ? (
        <View style={{ borderWidth: 2, borderColor: colors.primary, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 10 }}>Masalahnya sudah beres?</Text>
          <ErrorBanner message={fb.isError ? (fb.error instanceof ApiError ? fb.error.message : 'Gagal mengirim. Coba lagi.') : null} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button label="Ya, sudah" loading={fb.isPending} onPress={() => fb.mutate(true)} /></View>
            <View style={{ flex: 1 }}><Button label="Belum" variant="secondary" disabled={fb.isPending} onPress={() => fb.mutate(false)} /></View>
          </View>
        </View>
      ) : r.feedback === 'RESOLVED' ? (
        <Body muted>Terima kasih, Anda menyatakan masalah ini sudah beres.</Body>
      ) : null}

      {r.steps.map((s, i) => (
        <View key={s.key} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }} accessible accessibilityLabel={`${s.label}: ${s.state === 'done' ? 'selesai' : s.state === 'current' ? 'sedang berjalan' : s.state === 'failed' ? 'tidak dapat diproses' : 'belum'}`}>
          <Text style={{ fontSize: 22, color: MARK_COLOR[s.state], width: 26, textAlign: 'center' }}>{MARK[s.state]}</Text>
          <Text style={{ fontSize: 17, fontWeight: s.state === 'current' ? '700' : '500', color: colors.text }}>{i + 1}. {s.label}</Text>
        </View>
      ))}

      <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: spacing.md }}>Laporan Anda</Text>
      <Text style={{ fontSize: 17, lineHeight: 25, color: colors.text, marginBottom: spacing.sm }}>{r.content}</Text>
      {r.photos.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
          {r.photos.map((u) => <Image key={u} source={{ uri: u }} style={{ width: 110, height: 110, borderRadius: 10 }} contentFit="cover" accessibilityLabel="Foto laporan" />)}
        </View>
      ) : null}

      {r.responses.length ? <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.sm }}>TANGGAPAN</Text> : null}
      {r.responses.map((x) => (
        <View key={x.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{x.by} · {x.role}</Text>
          <Text style={{ fontSize: 16, color: colors.text, marginTop: 4, lineHeight: 23 }}>{x.text}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>{timeAgoId(x.at)}</Text>
        </View>
      ))}

      <View style={{ marginTop: spacing.md }}><ContactVillageButton /></View>
    </Screen>
  );
}
