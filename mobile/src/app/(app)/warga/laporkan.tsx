import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { Button, ErrorBanner, Field, ResultState, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { useInvalidateSocial } from '@/lib/queries';
import { colors, spacing } from '@/theme';

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
      <Screen background={colors.canvas} footer={<Button label="Selesai" onPress={() => router.back()} />}>
        <ResultState title="Terima kasih">
          <Text style={{ fontSize: 17, lineHeight: 25, color: colors.text, textAlign: 'center' }}>Laporan Anda diterima. Perangkat desa akan meninjau konten ini. Jika banyak warga melaporkan, konten disembunyikan sementara.</Text>
        </ResultState>
      </Screen>
    );
  }

  return (
    <Screen background={colors.canvas} footer={<Button label="Kirim laporan" icon="flag-outline" disabled={!reason} loading={busy} onPress={send} />}>
      <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: spacing.md }} accessibilityRole="header">Kenapa dilaporkan?</Text>
      <ErrorBanner message={error} />
      <View style={{ gap: 10, marginBottom: spacing.md }} accessibilityRole="radiogroup">
        {REASONS.map(([k, label, hint]) => {
          const on = reason === k;
          return (
            <Pressable key={k} onPress={() => setReason(k)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 18, borderWidth: 2, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : colors.bg, padding: spacing.md }}>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={26} color={on ? colors.primary : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{label}</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: colors.textMuted }}>{hint}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Field label="Keterangan tambahan (boleh dikosongkan)" value={note} onChangeText={setNote} multiline maxLength={300} placeholder="Ceritakan singkat bila perlu" />
    </Screen>
  );
}
