import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { ContactVillageButton } from '@/components/contact';
import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useInvalidateStaff, useStaffMailDetail } from '@/lib/queries';
import { colors, spacing } from '@/theme';

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{k}</Text>
      <Text style={{ fontSize: 17, color: colors.text }}>{v}</Text>
    </View>
  );
}

export default function StaffMailDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const q = useStaffMailDetail(numId);
  const invalidate = useInvalidateStaff();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: 'approve' | 'reject') {
    setBusy(true);
    setError(null);
    try {
      await post(`/staff/mail/${numId}/decision`, { decision, note: note.trim() });
      invalidate();
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memproses. Coba lagi.');
      setBusy(false);
    }
  }

  function approve() {
    Alert.alert('Setujui permohonan?', 'Warga akan diberi tahu lewat notifikasi.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Setujui', onPress: () => void decide('approve') },
    ]);
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
  const res = r.resident;

  return (
    <Screen
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
      footer={
        r.canDecide ? (
          rejecting ? (
            <View style={{ gap: 10 }}>
              <Button label="Kirim penolakan" loading={busy} disabled={note.trim().length < 5} onPress={() => void decide('reject')} />
              <Button label="Batal" variant="link" onPress={() => { setRejecting(false); setNote(''); }} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Button label="Setujui" loading={busy} onPress={approve} /></View>
              <View style={{ flex: 1 }}><Button label="Tolak" variant="secondary" disabled={busy} onPress={() => setRejecting(true)} /></View>
            </View>
          )
        ) : undefined
      }
    >
      <Title>{r.type}</Title>
      <Body muted>No. {r.number} · diajukan {formatDateId(r.createdAt)} lewat {r.channel === 'mobile' ? 'aplikasi' : r.channel}</Body>
      <ErrorBanner message={error} />

      {r.status !== 'pending' ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: r.status === 'approved' ? colors.primary : colors.danger }}>
            {r.status === 'approved' ? 'Sudah disetujui' : 'Sudah ditolak'}{r.processedAt ? ` · ${formatDateId(r.processedAt)}` : ''}
          </Text>
          {r.rejectionReason ? <Text style={{ fontSize: 16, color: colors.text, marginTop: 4 }}>Alasan: {r.rejectionReason}</Text> : null}
          {r.notes ? <Text style={{ fontSize: 16, color: colors.text, marginTop: 4 }}>Catatan: {r.notes}</Text> : null}
        </View>
      ) : null}

      <Row k="Pemohon" v={`${r.name}${r.onBehalf ? ' (diajukan oleh anggota keluarga)' : ''}`} />
      <Row k="NIK" v={r.nikMasked} />
      <Row k="Tempat, tanggal lahir" v={res ? `${res.birthplace}, ${formatDateId(res.birthDate)}` : null} />
      <Row k="Pekerjaan" v={res?.occupation} />
      <Row k="Alamat" v={res ? `${res.address}${res.rt ? `, RT ${res.rt}` : ''}${res.rw ? `/RW ${res.rw}` : ''}${res.hamlet ? `, ${res.hamlet}` : ''}` : 'Data penduduk tidak ditemukan di desa ini'} />
      <Row k="Keperluan" v={r.purpose} />
      <Row k="Catatan pemohon" v={r.note} />

      {r.status === 'pending' && !res ? <ErrorBanner message="NIK pemohon tidak cocok dengan data penduduk. Periksa sebelum menyetujui." /> : null}
      {r.waitingRt ? <Body muted>Menunggu pengantar Ketua RT. Permohonan bisa diputuskan desa setelah RT menyetujui.</Body> : null}
      {r.canDecide && !rejecting ? (
        <Body muted>Setelah disetujui, terbitkan suratnya di web (menu Layanan Surat) agar warga bisa mengunduh PDF-nya dari aplikasi.</Body>
      ) : null}
      {r.status === 'approved' ? <Body muted>{r.letterIssued ? 'Surat sudah diterbitkan; warga dapat mengunduhnya.' : 'Surat belum diterbitkan di web, jadi warga belum bisa mengunduh PDF.'}</Body> : null}

      {rejecting ? (
        <Field label="Alasan penolakan (dibaca warga)" value={note} onChangeText={setNote} autoCapitalize="sentences" multiline maxLength={500} hint="Jelaskan apa yang perlu diperbaiki, mis. foto KK kurang jelas." />
      ) : null}
      <View style={{ marginTop: spacing.md }}><ContactVillageButton label="Telepon kantor desa" /></View>
    </Screen>
  );
}
