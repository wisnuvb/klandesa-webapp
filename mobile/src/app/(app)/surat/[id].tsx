import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { STAGE_COLOR } from '@/components/cards';
import { ContactVillageButton } from '@/components/contact';
import { Body, Button, ErrorBanner, Screen, Title } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useRequest, type Step } from '@/lib/queries';
import { colors, spacing } from '@/theme';

const MARK: Record<Step['state'], string> = { done: '●', current: '◐', todo: '○', failed: '✕' };
const MARK_COLOR: Record<Step['state'], string> = { done: colors.primary, current: '#B26A00', todo: colors.textMuted, failed: colors.danger };

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

  if (q.isLoading) return <Screen><ActivityIndicator color={colors.primary} /></Screen>;
  if (q.isError || !q.data) {
    return (
      <Screen>
        <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat status surat.'} />
        <Button label="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </Screen>
    );
  }
  const r = q.data;

  return (
    <Screen
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
      footer={
        r.canDownload ? <Button label="Unduh Surat (PDF)" loading={busy} onPress={download} />
        : r.canRetry ? <Button label="Perbaiki & Kirim Lagi" onPress={() => router.push({ pathname: '/surat/baru', params: { templateId: String(r.templateId ?? ''), name: r.type, purpose: r.purpose } })} />
        : undefined
      }
    >
      <Title>{r.type}</Title>
      <Body muted>untuk {r.forName} · No. {r.number}</Body>
      <ErrorBanner message={error} />

      <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: STAGE_COLOR[r.stage] }}>{r.title}</Text>
        <Text style={{ fontSize: 16, color: colors.text, marginTop: 6, lineHeight: 23 }}>{r.next}</Text>
        {r.estimate ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}>{r.estimate}</Text> : null}
      </View>

      {r.steps.map((s, i) => (
        <View key={s.key} style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }} accessible accessibilityLabel={`${s.label}: ${s.state === 'done' ? 'selesai' : s.state === 'current' ? 'sedang berjalan' : s.state === 'failed' ? 'perlu perbaikan' : 'belum'}${s.at ? `, ${formatDateId(s.at)}` : ''}`}>
          <Text style={{ fontSize: 22, color: MARK_COLOR[s.state], width: 26, textAlign: 'center' }}>{MARK[s.state]}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: s.state === 'current' ? '700' : '500', color: colors.text }}>{i + 1}. {s.label}</Text>
            {s.at ? <Text style={{ fontSize: 14, color: colors.textMuted }}>{formatDateId(s.at)}</Text> : null}
          </View>
        </View>
      ))}

      <View style={{ marginTop: spacing.md }}>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>Keperluan</Text>
        <Text style={{ fontSize: 17, color: colors.text }}>{r.purpose}</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 10 }}>Dikirim</Text>
        <Text style={{ fontSize: 17, color: colors.text }}>{formatDateId(r.createdAt)}</Text>
      </View>
      <View style={{ marginTop: spacing.lg }}><ContactVillageButton /></View>
    </Screen>
  );
}
