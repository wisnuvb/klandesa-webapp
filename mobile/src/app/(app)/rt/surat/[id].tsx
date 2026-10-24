import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
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

  if (q.isLoading) return <Screen><ActivityIndicator color={colors.primary} /></Screen>;
  if (q.isError || !q.data) {
    return (
      <Screen>
        <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat permohonan.'} />
        <Button label="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </Screen>
    );
  }
  const r = q.data;
  return (
    <Screen
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
      <Title>{r.type}</Title>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{r.name}{r.onBehalf ? ' (dibuatkan keluarga)' : ''}</Text>
      <Text style={{ fontSize: 14, color: colors.textMuted }}>NIK {r.nikMasked} · diajukan {timeAgoId(r.createdAt)}</Text>
      {r.resident ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={{ fontSize: 15, color: colors.text }}>{r.resident.familyRole} · lahir {formatDateId(r.resident.birthDate)}</Text>
          {r.resident.occupation ? <Text style={{ fontSize: 15, color: colors.text }}>Pekerjaan: {r.resident.occupation}</Text> : null}
          <Text style={{ fontSize: 15, color: colors.text }}>{r.resident.address}</Text>
        </View>
      ) : null}
      <View style={{ marginTop: spacing.md }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>KEPERLUAN</Text>
        <Text style={{ fontSize: 17, color: colors.text }}>{r.purpose}</Text>
        {r.note ? <Text style={{ fontSize: 15, color: colors.textMuted }}>Catatan warga: {r.note}</Text> : null}
      </View>
      {!r.canDecide ? (
        <Body>{r.rtStatus === 'approved' ? `Sudah Anda setujui${r.decidedAt ? ` ${timeAgoId(r.decidedAt)}` : ''}.` : r.rtStatus === 'rejected' ? `Sudah Anda tolak: ${r.rtNote ?? ''}` : 'Permohonan ini sudah diputuskan.'}</Body>
      ) : <Body muted>Setujui bila Anda mengenal pemohon sebagai warga RT Anda. Permohonan lalu diperiksa kantor desa.</Body>}
      <ErrorBanner message={error} />
      {rejecting ? <Field label="Alasan penolakan" value={note} onChangeText={setNote} maxLength={300} hint="Warga akan membaca alasan ini. Minimal 5 huruf." /> : null}
    </Screen>
  );
}
