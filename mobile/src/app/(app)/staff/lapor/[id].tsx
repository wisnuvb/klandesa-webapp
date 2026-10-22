import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, View } from 'react-native';

import { STAGE_COLOR } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { formatDateId, timeAgoId } from '@/lib/format';
import { useInvalidateStaff, useStaffReportDetail } from '@/lib/queries';
import { colors, spacing } from '@/theme';

const ACTION_LABEL: Record<string, string> = { PROCESS: 'Mulai tangani', DONE: 'Tandai selesai', REJECT: 'Tolak' };

export default function StaffReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const q = useStaffReportDetail(numId);
  const invalidate = useInvalidateStaff();
  const [reply, setReply] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<unknown>, after?: () => void) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      invalidate();
      after?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memproses. Coba lagi.');
    } finally {
      setBusy(null);
    }
  }

  const setStatus = (status: string) => run(status, () => post(`/staff/reports/${numId}/status`, { status, reason: reason.trim() }), () => { setRejecting(false); setReason(''); });
  const confirmStatus = (status: string) =>
    Alert.alert(ACTION_LABEL[status], status === 'DONE' ? 'Pelapor akan ditanya apakah masalahnya benar-benar beres.' : 'Pelapor akan diberi tahu lewat notifikasi.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Lanjut', onPress: () => void setStatus(status) },
    ]);

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
  const loc = r.location;

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{r.category.toUpperCase()}</Text>
      <Title>{r.title}</Title>
      <Body muted>Dilaporkan {formatDateId(r.createdAt)} oleh {r.reporter}{r.reporterWantsAnonymous ? ' (minta namanya disembunyikan dari warga lain)' : ''}</Body>
      <ErrorBanner message={error} />

      <Text style={{ fontSize: 17, fontWeight: '700', color: STAGE_COLOR[r.stage], marginBottom: spacing.sm }}>{r.stageTitle}</Text>
      {r.feedback === 'NOT_RESOLVED' ? <ErrorBanner message="Pelapor menyatakan masalah ini belum selesai dan meminta ditinjau kembali." /> : null}

      <Text style={{ fontSize: 17, lineHeight: 25, color: colors.text, marginBottom: spacing.sm }}>{r.content}</Text>
      {r.photos.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
          {r.photos.map((u) => <Image key={u} source={{ uri: u }} style={{ width: 110, height: 110, borderRadius: 10 }} contentFit="cover" accessibilityLabel="Foto laporan" />)}
        </View>
      ) : null}

      <Text style={{ fontSize: 13, color: colors.textMuted }}>Lokasi</Text>
      <Text style={{ fontSize: 17, color: colors.text, marginBottom: 6 }}>
        {[r.locationNote, r.resident ? [r.resident.rt && `RT ${r.resident.rt}`, r.resident.rw && `RW ${r.resident.rw}`].filter(Boolean).join('/') : null].filter(Boolean).join(' · ') || 'Tidak dicantumkan'}
      </Text>
      {loc ? (
        <Button label="Buka lokasi di peta" variant="secondary" onPress={() => void Linking.openURL(`geo:${loc.lat},${loc.lng}?q=${loc.lat},${loc.lng}(Lokasi laporan)`)} />
      ) : null}

      {r.actions.length > 0 ? (
        <View style={{ marginTop: spacing.lg, gap: 10 }}>
          {r.actions.filter((a) => a !== 'REJECT').map((a) => (
            <Button key={a} label={ACTION_LABEL[a]!} loading={busy === a} disabled={busy !== null} onPress={() => confirmStatus(a)} />
          ))}
          {r.actions.includes('REJECT') ? (
            rejecting ? (
              <>
                <Field label="Alasan penolakan (dibaca pelapor)" value={reason} onChangeText={setReason} autoCapitalize="sentences" multiline maxLength={1000} />
                <Button label="Kirim penolakan" loading={busy === 'REJECT'} disabled={reason.trim().length < 5 || busy !== null} onPress={() => void setStatus('REJECT')} />
                <Button label="Batal" variant="link" onPress={() => { setRejecting(false); setReason(''); }} />
              </>
            ) : (
              <Button label="Tolak" variant="secondary" disabled={busy !== null} onPress={() => setRejecting(true)} />
            )
          ) : null}
        </View>
      ) : null}

      {r.responses.length ? <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm }}>TANGGAPAN</Text> : null}
      {r.responses.map((x) => (
        <View key={x.id} style={{ backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{x.by} · {x.role}</Text>
          <Text style={{ fontSize: 16, color: colors.text, marginTop: 4, lineHeight: 23 }}>{x.text}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>{timeAgoId(x.at)}</Text>
        </View>
      ))}

      {r.canRespond ? (
        <View style={{ marginTop: spacing.md }}>
          <Field label="Tulis tanggapan untuk pelapor" value={reply} onChangeText={setReply} autoCapitalize="sentences" multiline maxLength={1000} hint="Pelapor menerima notifikasi." />
          <Button label="Kirim tanggapan" variant="secondary" loading={busy === 'respond'} disabled={reply.trim().length < 3 || busy !== null}
            onPress={() => void run('respond', () => post(`/staff/reports/${numId}/respond`, { text: reply.trim() }), () => setReply(''))} />
        </View>
      ) : null}
      <View style={{ height: spacing.lg }} />
      <Button label="Kembali ke antrean" variant="link" onPress={() => router.back()} />
    </Screen>
  );
}
