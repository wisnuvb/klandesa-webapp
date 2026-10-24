import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Card, Empty } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { timeAgoId } from '@/lib/format';
import { useStaffDataChanges, type StaffDataChange } from '@/lib/queries';
import { colors, spacing } from '@/theme';

function Row({ r, onDone }: { r: StaffDataChange; onDone: () => void }) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'approve' | 'reject') {
    setBusy(true); setError(null);
    try {
      await post(`/staff/data-changes/${r.id}/decision`, { decision, note: note.trim() || undefined });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memproses.');
    } finally { setBusy(false); }
  }

  return (
    <Card label={`${r.fieldLabel} untuk ${r.residentName}`}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{r.residentName}</Text>
      {r.nikMasked ? <Text style={{ fontSize: 13, color: colors.textMuted }}>NIK {r.nikMasked}</Text> : null}
      <Text style={{ fontSize: 15, color: colors.text, marginTop: 6 }}>{r.fieldLabel}</Text>
      <Text style={{ fontSize: 15, color: colors.textMuted }}>Sekarang: {r.oldValue ?? '(kosong)'}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>Diajukan: {r.newValue}</Text>
      {r.note ? <Text style={{ fontSize: 14, color: colors.textMuted }}>Catatan warga: {r.note}</Text> : null}
      <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>{timeAgoId(r.createdAt)}</Text>
      {!r.autoApply ? <Body muted>Kolom identitas: periksa dokumen. Setelah disetujui, ubah datanya di web admin.</Body> : null}
      <ErrorBanner message={error} />
      {rejecting ? (
        <>
          <Field label="Alasan penolakan" value={note} onChangeText={setNote} maxLength={300} />
          <Button label="Tolak pengajuan" variant="secondary" loading={busy} disabled={note.trim().length < 5} onPress={() => decide('reject')} />
          <Button label="Batal" variant="link" onPress={() => setRejecting(false)} />
        </>
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label={r.autoApply ? 'Setujui dan perbarui data' : 'Setujui'} loading={busy} onPress={() => decide('approve')} />
          <Button label="Tolak" variant="secondary" onPress={() => setRejecting(true)} />
        </View>
      )}
    </Card>
  );
}

export default function StaffKoreksi() {
  const q = useStaffDataChanges('pending');
  const qc = useQueryClient();
  const refresh = () => void qc.invalidateQueries({ queryKey: ['staff-data-changes'] });
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Body muted>Warga mengajukan perbaikan datanya. Alamat, telepon, dan sejenisnya langsung diperbarui saat disetujui.</Body>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat.'} /> : null}
      {q.isSuccess && q.data.items.length === 0 ? <Empty title="Tidak ada pengajuan" hint="Semua koreksi data sudah diperiksa." /> : null}
      {q.data?.items.map((r) => <Row key={r.id} r={r} onDone={refresh} />)}
    </Screen>
  );
}
