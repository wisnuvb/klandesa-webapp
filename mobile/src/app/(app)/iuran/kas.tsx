import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { Text } from '@/components/text';

import { Card, Empty, SectionTitle } from '@/components/cards';
import { AmountField, Chips, ProofPhoto } from '@/components/fees';
import { Body, Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, api, post } from '@/lib/api';
import { formatDateId, formatRupiahFull, parseRupiahInput } from '@/lib/format';
import { useCashBook, useInvalidateFees, type FeeScope } from '@/lib/queries';
import { colors, spacing } from '@/theme';

const TYPES = [{ key: 'out', label: 'Pengeluaran' }, { key: 'in', label: 'Pemasukan lain' }] as const;
const CATS = [
  { key: 'kegiatan', label: 'Kegiatan' }, { key: 'perlengkapan', label: 'Perlengkapan' }, { key: 'keamanan', label: 'Keamanan' },
  { key: 'kebersihan', label: 'Kebersihan' }, { key: 'sosial', label: 'Sosial' }, { key: 'honor', label: 'Honor' }, { key: 'lainnya', label: 'Lainnya' },
] as const;

export default function Kas() {
  const { scope: raw } = useLocalSearchParams<{ scope?: string }>();
  const scope: FeeScope = raw === 'desa' ? 'desa' : 'rt';
  const q = useCashBook(scope);
  const refresh = useInvalidateFees();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<'in' | 'out' | null>('out');
  const [category, setCategory] = useState<(typeof CATS)[number]['key'] | null>('kegiatan');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const n = parseRupiahInput(amount);
    if (!type || !n) return setError('Pilih jenis dan isi nominal.');
    setBusy(true); setError(null);
    try {
      await post(`/fees/cash?scope=${scope}`, { type, category, amount: n, description: desc, receiptUrl: receipt ?? undefined });
      setAdding(false); setAmount(''); setDesc(''); setReceipt(null);
      await refresh();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Gagal menyimpan.'); }
    finally { setBusy(false); }
  }

  const [voidId, setVoidId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState('');
  async function doVoid(id: number) {
    setBusy(true); setError(null);
    try {
      await api(`/fees/cash/${id}?scope=${scope}`, { method: 'DELETE', body: JSON.stringify({ reason: voidReason.trim() }) });
      setVoidId(null); setVoidReason('');
      await refresh();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Gagal membatalkan.'); }
    finally { setBusy(false); }
  }
  // Alert.prompt hanya ada di iOS; di Android alasan diisi lewat kolom di kartu.
  const askVoid = (id: number, d: string) => Alert.alert('Batalkan catatan?', `"${d}" tidak akan dihitung lagi. Lanjut mengisi alasan?`, [
    { text: 'Kembali', style: 'cancel' }, { text: 'Lanjut', style: 'destructive', onPress: () => { setVoidId(id); setVoidReason(''); } },
  ]);

  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Body muted>Catat uang masuk dan keluar di luar iuran (iuran yang sudah dikonfirmasi dihitung otomatis).</Body>
      <ErrorBanner message={error} />
      {adding ? (
        <Card>
          <Chips options={TYPES.map((t) => ({ key: t.key, label: t.label }))} value={type} onChange={setType} />
          <AmountField label="Nominal" value={amount} onChange={setAmount} />
          <Field label="Keterangan" value={desc} onChangeText={setDesc} maxLength={200} hint="Contoh: Beli lampu pos ronda." />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 }}>Kategori</Text>
          <Chips options={CATS.map((c) => ({ key: c.key, label: c.label }))} value={category} onChange={setCategory} />
          <ProofPhoto label="Foto nota (boleh dilewati)" url={receipt} onUrl={setReceipt} />
          <Button label="Simpan catatan" icon="checkmark-circle-outline" loading={busy} disabled={desc.trim().length < 3} onPress={save} />
          <Button label="Batal" variant="link" onPress={() => { setAdding(false); setError(null); }} />
        </Card>
      ) : <Button label="Catat uang masuk/keluar" icon="add-circle-outline" onPress={() => setAdding(true)} />}

      <SectionTitle>CATATAN TERBARU</SectionTitle>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isSuccess && q.data.items.length === 0 ? <Empty title="Belum ada catatan" /> : null}
      {q.data?.items.map((e) => (
        <Card key={e.id} label={`${e.type === 'in' ? 'Masuk' : 'Keluar'} ${formatRupiahFull(e.amount)}, ${e.description}`}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.text }}>{e.description}</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: e.type === 'in' ? colors.primary : colors.danger }}>{e.type === 'in' ? '+' : '−'}{formatRupiahFull(e.amount)}</Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{e.type === 'in' ? 'Masuk' : 'Keluar'} · {formatDateId(e.entryDate)}{e.receiptUrl ? ' · ada foto nota' : ''}</Text>
          {voidId === e.id ? (
            <View style={{ marginTop: spacing.sm }}>
              <Field label="Alasan pembatalan" value={voidReason} onChangeText={setVoidReason} maxLength={200} />
              <Button label="Batalkan catatan" variant="secondary" loading={busy} disabled={voidReason.trim().length < 3} onPress={() => void doVoid(e.id)} />
              <Button label="Kembali" variant="link" onPress={() => setVoidId(null)} />
            </View>
          ) : <View style={{ marginTop: spacing.xs }}><Button label="Batalkan catatan ini" variant="link" onPress={() => askVoid(e.id, e.description)} /></View>}
        </Card>
      ))}
    </Screen>
  );
}
