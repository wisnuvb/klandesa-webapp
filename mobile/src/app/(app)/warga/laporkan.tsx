import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { useInvalidateSocial } from '@/lib/queries';
import { colors } from '@/theme';

const REASONS: [string, string, string][] = [
  ['hoaks', 'Kabar bohong (hoaks)', 'Informasi yang tidak benar atau menyesatkan.'],
  ['sara', 'SARA / kebencian', 'Menghina suku, agama, ras, atau golongan.'],
  ['kasar', 'Kasar / mengancam', 'Kata kasar, hinaan, atau ancaman.'],
  ['penipuan', 'Penipuan / judi / pinjol', 'Menawarkan sesuatu yang mencurigakan.'],
  ['pribadi', 'Data pribadi / foto anak', 'Membuka data pribadi orang lain tanpa izin.'],
  ['lainnya', 'Lainnya', 'Pelanggaran lain terhadap aturan komunitas.'],
];

export default function Laporkan() {
  const p = useLocalSearchParams<{ targetType: 'post' | 'comment'; targetId: string }>();
  const invalidate = useInvalidateSocial();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      await post('/social/report', { targetType: p.targetType, targetId: p.targetId, reason, note: note.trim() || undefined });
      invalidate();
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim laporan.');
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Screen footer={<Button label="Selesai" onPress={() => router.back()} />}>
        <Title>Terima kasih</Title>
        <Body>Laporan Anda diterima. Perangkat desa akan meninjau konten ini. Jika banyak warga melaporkan, konten disembunyikan sementara.</Body>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label="Kirim laporan" disabled={!reason} loading={busy} onPress={send} />}>
      <Title>Kenapa dilaporkan?</Title>
      <ErrorBanner message={error} />
      {REASONS.map(([k, label, hint]) => (
        <Pressable key={k} onPress={() => setReason(k)} accessibilityRole="radio" accessibilityState={{ selected: reason === k }}
          style={{ minHeight: 64, borderRadius: 14, borderWidth: 2, borderColor: reason === k ? colors.primary : colors.border, backgroundColor: reason === k ? '#E3F3EA' : colors.bg, padding: 12, marginBottom: 10, justifyContent: 'center' }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{label}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{hint}</Text>
        </Pressable>
      ))}
      <Field label="Keterangan tambahan (boleh dikosongkan)" value={note} onChangeText={setNote} multiline maxLength={300} />
    </Screen>
  );
}
