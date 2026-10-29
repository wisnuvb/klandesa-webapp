import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/text';

import { Card, Chip, SectionHeader, StatusHero, Timeline } from '@/components/cards';
import { ContactVillageButton } from '@/components/contact';
import { Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useRequest } from '@/lib/queries';
import { colors, spacing } from '@/theme';


export default function MailDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const q = useRequest(numId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const doc = await api<{ title: string; letterNumber: string; html: string }>(`/mail/requests/${numId}/document`);
      const { uri } = await Print.printToFileAsync({ html: doc.html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: doc.title, UTI: 'com.adobe.pdf' });
      } else {
        setError('Perangkat ini tidak bisa membagikan berkas.');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menyiapkan surat. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  if (q.isLoading) return <Screen background={colors.canvas}><ActivityIndicator color={colors.primary} /></Screen>;
  if (q.isError || !q.data) {
    return (
      <Screen background={colors.canvas}>
        <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat status surat.'} />
        <Button label="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </Screen>
    );
  }
  const r = q.data;

  return (
    <Screen
      background={colors.canvas}
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
      footer={
        r.canDownload ? <Button label="Unduh Surat (PDF)" icon="download-outline" loading={busy} onPress={download} />
        : r.canRetry ? <Button label="Perbaiki & Kirim Lagi" icon="refresh-outline" onPress={() => router.push({ pathname: '/surat/baru', params: { templateId: String(r.templateId ?? ''), name: r.type, purpose: r.purpose } })} />
        : undefined
      }
    >
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }} accessibilityRole="header">{r.type}</Text>
        <Text style={{ fontSize: 15, color: colors.textMuted }}>untuk {r.forName}</Text>
        <View style={{ marginTop: 4 }}><Chip label={`No. ${r.number}`} icon="document-text-outline" /></View>
      </View>
      <ErrorBanner message={error} />

      <View style={{ marginTop: spacing.md }}>
        <StatusHero stage={r.stage} title={r.title} next={r.next} note={r.estimate} />
      </View>

      <SectionHeader>Perkembangan surat</SectionHeader>
      <Card>
        <Timeline steps={r.steps.map((s) => ({ ...s, at: s.at ? formatDateId(s.at) : null }))} />
      </Card>

      <SectionHeader>Rincian</SectionHeader>
      <Card>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>Keperluan</Text>
        <Text style={{ fontSize: 17, lineHeight: 24, color: colors.text, marginTop: 2 }}>{r.purpose}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: spacing.md }}>Dikirim</Text>
        <Text style={{ fontSize: 17, color: colors.text, marginTop: 2 }}>{formatDateId(r.createdAt)}</Text>
      </Card>
      <View style={{ marginTop: spacing.md }}><ContactVillageButton /></View>
    </Screen>
  );
}
