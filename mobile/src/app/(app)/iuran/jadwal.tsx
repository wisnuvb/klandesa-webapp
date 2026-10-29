import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

import { Card, Empty, SectionTitle } from '@/components/cards';
import { AmountField, Chips, ProofPhoto } from '@/components/fees';
import { Body, Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, api, post } from '@/lib/api';
import { formatRupiahFull, parseRupiahInput, periodLabelId } from '@/lib/format';
import { useFeeSchedules, useInvalidateFees, type FeeScope } from '@/lib/queries';
import { colors, spacing } from '@/theme';

const CATEGORIES = [
  { key: 'iuran_rt', label: 'Iuran RT' }, { key: 'keamanan', label: 'Keamanan' }, { key: 'kebersihan', label: 'Kebersihan' },
  { key: 'sosial', label: 'Dana sosial' }, { key: 'retribusi', label: 'Retribusi' }, { key: 'pbb', label: 'PBB (catat)' }, { key: 'lainnya', label: 'Lainnya' },
] as const;
const RECUR = [{ key: 'monthly', label: 'Tiap bulan' }, { key: 'once', label: 'Sekali' }] as const;

export default function Jadwal() {
  const { scope: raw } = useLocalSearchParams<{ scope?: string }>();
  const scope: FeeScope = raw === 'desa' ? 'desa' : 'rt';
  const q = useFeeSchedules(scope);
  const refresh = useInvalidateFees();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['key'] | null>(scope === 'rt' ? 'iuran_rt' : 'retribusi');
  const [recurrence, setRecurrence] = useState<'monthly' | 'once' | null>('monthly');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('10');
  const [payInfo, setPayInfo] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const n = parseRupiahInput(amount);
    if (!category || !recurrence) return setError('Pilih jenis dan jangka iuran.');
    if (!n) return setError('Isi nominal per KK.');
    setBusy(true); setError(null);
    try {
      const r = await post<{ id: number; chargesCreated: number }>(`/fees/schedules?scope=${scope}`, {
        name, category, amount: n, recurrence, dueDay: Number(dueDay) || 10, payInfo: payInfo.trim() || undefined, payQrUrl: qr ?? undefined,
      });
      setAdding(false); setName(''); setAmount(''); setPayInfo(''); setQr(null);
      await refresh();
      Alert.alert('Iuran dibuat', `${r.chargesCreated} tagihan KK sudah dibuat dan warga diberi tahu.`);
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Gagal menyimpan.'); }
    finally { setBusy(false); }
  }

  const stop = (id: number, n: string) => Alert.alert('Hentikan iuran?', `${n} tidak akan membuat tagihan baru. Tagihan yang sudah ada tetap tercatat.`, [
    { text: 'Batal', style: 'cancel' },
    { text: 'Hentikan', style: 'destructive', onPress: () => void api(`/fees/schedules/${id}?scope=${scope}`, { method: 'PATCH', body: JSON.stringify({ isActive: false }) }).then(() => refresh()).catch((e) => setError(e instanceof ApiError ? e.message : 'Gagal.')) },
  ]);

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Body muted>{scope === 'rt' ? 'Iuran untuk warga RT Anda. Tagihan dibuat otomatis per KK setiap bulan.' : 'Retribusi/iuran tingkat desa. Tagihan dibuat otomatis per KK untuk seluruh desa.'}</Body>
      <ErrorBanner message={error} />

      {adding ? (
        <Card>
          <Field label="Nama iuran" value={name} onChangeText={setName} maxLength={80} hint="Contoh: Iuran keamanan, Iuran sampah." />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 }}>Jenis</Text>
          <Chips options={CATEGORIES.filter((c) => scope === 'rt' ? c.key !== 'retribusi' : c.key !== 'iuran_rt').map((c) => ({ key: c.key, label: c.label }))} value={category} onChange={setCategory} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 }}>Jangka</Text>
          <Chips options={RECUR.map((r) => ({ key: r.key, label: r.label }))} value={recurrence} onChange={setRecurrence} />
          <AmountField label="Nominal per KK" value={amount} onChange={setAmount} hint="per bulan atau sekali" />
          <Field label="Jatuh tempo (tanggal 1–28)" value={dueDay} onChangeText={setDueDay} keyboardType="number-pad" maxLength={2} />
          <Field label="Cara bayar (rekening/QRIS)" value={payInfo} onChangeText={setPayInfo} multiline maxLength={500} hint="Contoh: Transfer BRI 1234-5678 a.n. Bendahara RT 03, atau bayar tunai ke rumah bendahara." />
          <ProofPhoto label="Gambar QRIS (boleh dilewati)" url={qr} onUrl={setQr} />
          <Body muted>Klandesa tidak memegang uang. Warga membayar langsung ke rekening atau QRIS Anda, lalu melapor di aplikasi.</Body>
          <Button label="Buat iuran" icon="checkmark-circle-outline" loading={busy} disabled={name.trim().length < 3} onPress={create} />
          <Button label="Batal" variant="link" onPress={() => { setAdding(false); setError(null); }} />
        </Card>
      ) : <Button label="Buat iuran baru" icon="add-circle-outline" onPress={() => setAdding(true)} />}

      <SectionTitle>JADWAL IURAN</SectionTitle>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isSuccess && q.data.items.length === 0 ? <Empty title="Belum ada iuran" hint="Buat iuran pertama dengan tombol di atas." /> : null}
      {q.data?.items.map((s) => (
        <Card key={s.id} label={`${s.name}, ${formatRupiahFull(s.amount)}`}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: s.isActive ? colors.primary : colors.textMuted }}>{s.categoryLabel.toUpperCase()}{s.isActive ? '' : ' · BERHENTI'}</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{s.name}</Text>
          <Text style={{ fontSize: 16, color: colors.text }}>{formatRupiahFull(s.amount)} per KK · {s.recurrence === 'monthly' ? 'tiap bulan' : 'sekali'}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Mulai {periodLabelId(s.startPeriod)} · jatuh tempo tanggal {s.dueDay}</Text>
          {s.payInfo ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>{s.payInfo}</Text> : null}
          {s.payQrUrl ? <Image source={{ uri: s.payQrUrl }} style={{ width: 96, height: 96, marginTop: 6 }} contentFit="contain" accessibilityLabel="Gambar QRIS" /> : null}
          {s.isActive ? <View style={{ marginTop: spacing.sm }}><Button label="Hentikan iuran" variant="link" onPress={() => stop(s.id, s.name)} /></View> : null}
        </Card>
      ))}
    </Screen>
  );
}
