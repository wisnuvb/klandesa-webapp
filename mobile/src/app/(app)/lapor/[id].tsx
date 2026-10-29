import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { Card, Chip, InfoBox, SectionHeader, StatusHero, Timeline } from '@/components/cards';
import { ContactVillageButton } from '@/components/contact';
import { Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId, timeAgoId } from '@/lib/format';
import { useReport, useReportFeedback } from '@/lib/queries';
import { colors, spacing } from '@/theme';


export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const q = useReport(numId);
  const fb = useReportFeedback(numId);

  if (q.isLoading) return <Screen background={colors.canvas}><ActivityIndicator color={colors.primary} /></Screen>;
  if (q.isError || !q.data) {
    return (
      <Screen background={colors.canvas}>
        <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat laporan.'} />
        <Button label="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </Screen>
    );
  }
  const r = q.data;

  return (
    <Screen background={colors.canvas} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <View style={{ gap: 6 }}>
        <Chip label={r.category.toUpperCase()} tone="green" />
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }} accessibilityRole="header">{r.title}</Text>
        <Text style={{ fontSize: 15, color: colors.textMuted }}>Dikirim {formatDateId(r.createdAt)}{r.locationNote ? ` · ${r.locationNote}` : ''}</Text>
      </View>

      <View style={{ marginTop: spacing.md }}>
        <StatusHero stage={r.stage} title={r.stageTitle} next={r.next} />
      </View>

      {r.canGiveFeedback ? (
        <View style={{ borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.bg, borderRadius: 20, padding: spacing.md, marginTop: spacing.md }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10 }}>Masalahnya sudah beres?</Text>
          <ErrorBanner message={fb.isError ? (fb.error instanceof ApiError ? fb.error.message : 'Gagal mengirim. Coba lagi.') : null} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button label="Ya, sudah" icon="checkmark" loading={fb.isPending} onPress={() => fb.mutate(true)} /></View>
            <View style={{ flex: 1 }}><Button label="Belum" variant="secondary" disabled={fb.isPending} onPress={() => fb.mutate(false)} /></View>
          </View>
        </View>
      ) : r.feedback === 'RESOLVED' ? (
        <View style={{ marginTop: spacing.md }}><InfoBox tone="ok">Terima kasih, Anda menyatakan masalah ini sudah beres.</InfoBox></View>
      ) : null}

      <SectionHeader>Perkembangan laporan</SectionHeader>
      <Card><Timeline steps={r.steps} /></Card>

      <SectionHeader>Laporan Anda</SectionHeader>
      <Card>
        <Text style={{ fontSize: 17, lineHeight: 25, color: colors.text }}>{r.content}</Text>
        {r.photos.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.md }}>
            {r.photos.map((u) => <Image key={u} source={{ uri: u }} style={{ width: 104, height: 104, borderRadius: 12 }} contentFit="cover" accessibilityLabel="Foto laporan" />)}
          </View>
        ) : null}
      </Card>

      {r.responses.length ? <SectionHeader>Tanggapan desa</SectionHeader> : null}
      {r.responses.map((x) => (
        <View key={x.id} style={{ backgroundColor: colors.primarySoft, borderRadius: 18, padding: spacing.md, marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: colors.text }}>{x.by} · {x.role}</Text>
          </View>
          <Text style={{ fontSize: 16, color: colors.text, marginTop: 6, lineHeight: 23 }}>{x.text}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>{timeAgoId(x.at)}</Text>
        </View>
      ))}

      <View style={{ marginTop: spacing.md }}><ContactVillageButton /></View>
    </Screen>
  );
}
