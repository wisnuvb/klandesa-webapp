import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/text';
import { useQueryClient } from '@tanstack/react-query';

import { Avatar, Card, Chip, InfoBox, SectionHeader } from '@/components/cards';
import { Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { formatDateId, timeAgoId } from '@/lib/format';
import { useRtRequest } from '@/lib/queries';
import { colors, spacing } from '@/theme';

export default function RtSurat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const q = useRtRequest(numId);
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'approve' | 'reject') {
    setBusy(true); setError(null);
    try {
      await post(`/rt/requests/${numId}/decision`, { decision, note: note.trim() || undefined });
      await Promise.all([qc.invalidateQueries({ queryKey: ['rt-requests'] }), qc.invalidateQueries({ queryKey: ['rt-summary'] }), qc.invalidateQueries({ queryKey: ['rt-request', numId] })]);
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memproses. Coba lagi.');
    } finally { setBusy(false); }
  }

  if (q.isLoading) return <Screen background={colors.canvas}><ActivityIndicator color={colors.primary} /></Screen>;
  if (q.isError || !q.data) {
    return (
      <Screen background={colors.canvas}>
        <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat permohonan.'} />
        <Button label="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </Screen>
    );
  }
  const r = q.data;
  return (
    <Screen
      background={colors.canvas}
      footer={r.canDecide ? (
        rejecting ? (
          <View style={{ gap: spacing.sm }}>
            <Button label="Tolak permohonan" variant="secondary" loading={busy} disabled={note.trim().length < 5} onPress={() => decide('reject')} />
            <Button label="Batal" variant="link" onPress={() => setRejecting(false)} />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <Button label="Setuju, teruskan ke desa" loading={busy} onPress={() => decide('approve')} />
            <Button label="Tolak" variant="secondary" onPress={() => setRejecting(true)} />
          </View>
        )
      ) : undefined}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={r.name} size={56} tone="deep" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }} accessibilityRole="header">{r.name}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>NIK {r.nikMasked}{r.onBehalf ? ' · dibuatkan keluarga' : ''}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.md, alignItems: 'center' }}>
        <Chip label={r.type} tone="green" icon="document-text-outline" />
        <Text style={{ fontSize: 14, color: colors.textMuted }}>diajukan {timeAgoId(r.createdAt)}</Text>
      </View>

      {r.resident ? (
        <>
          <SectionHeader>Data pemohon</SectionHeader>
          <Card>
            <Text style={{ fontSize: 16, color: colors.text }}>{r.resident.familyRole} · lahir {formatDateId(r.resident.birthDate)}</Text>
            {r.resident.occupation ? <Text style={{ fontSize: 16, color: colors.text, marginTop: 4 }}>Pekerjaan: {r.resident.occupation}</Text> : null}
            <Text style={{ fontSize: 16, color: colors.text, marginTop: 4 }}>{r.resident.address}</Text>
          </Card>
        </>
      ) : null}

      <SectionHeader>Keperluan</SectionHeader>
      <Card>
        <Text style={{ fontSize: 17, lineHeight: 24, color: colors.text }}>{r.purpose}</Text>
        {r.note ? <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 6 }}>Catatan warga: {r.note}</Text> : null}
      </Card>

      <View style={{ marginTop: spacing.md }}>
        {!r.canDecide ? (
          <InfoBox tone={r.rtStatus === 'approved' ? 'ok' : r.rtStatus === 'rejected' ? 'warn' : 'info'}>
            {r.rtStatus === 'approved' ? `Sudah Anda setujui${r.decidedAt ? ` ${timeAgoId(r.decidedAt)}` : ''}.` : r.rtStatus === 'rejected' ? `Sudah Anda tolak: ${r.rtNote ?? ''}` : 'Permohonan ini sudah diputuskan.'}
          </InfoBox>
        ) : <InfoBox>Setujui bila Anda mengenal pemohon sebagai warga RT Anda. Permohonan lalu diperiksa kantor desa.</InfoBox>}
      </View>
      <ErrorBanner message={error} />
      {rejecting ? <View style={{ marginTop: spacing.md }}><Field label="Alasan penolakan" value={note} onChangeText={setNote} maxLength={300} placeholder="Tulis alasan singkat" hint="Warga akan membaca alasan ini. Minimal 5 huruf." /></View> : null}
    </Screen>
  );
}
