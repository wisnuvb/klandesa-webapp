import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Card, Empty, SectionTitle } from '@/components/cards';
import { AmountField, Chips, METHODS, ProofPhoto, StatusBadge } from '@/components/fees';
import { Body, Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId, formatRupiahFull, parseRupiahInput, periodLabelId } from '@/lib/format';
import { useClaimPayment, useMyFees, type MyCharge } from '@/lib/queries';
import { colors, spacing } from '@/theme';

function ChargeCard({ c }: { c: MyCharge }) {
  const claim = useClaimPayment();
  const [open, setOpen] = useState(false);
  const room = c.outstanding - c.pending;
  const [method, setMethod] = useState<'cash' | 'transfer' | 'qris' | null>(null);
  const [amount, setAmount] = useState(String(Math.max(0, room)));
  const [proof, setProof] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const canPay = c.status !== 'paid' && c.status !== 'waived' && room > 0;

  async function submit() {
    if (!method) return setError('Pilih cara Anda membayar.');
    const n = parseRupiahInput(amount);
    if (!n) return setError('Isi nominal yang Anda bayar.');
    setError(null);
    try {
      await claim.mutateAsync({ id: c.id, method, amount: n, proofUrl: proof ?? undefined, note: note.trim() || undefined });
      setSent(true); setOpen(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim. Coba lagi.');
    }
  }

  return (
    <Card label={`${c.scheduleName} ${periodLabelId(c.period)}, ${c.statusLabel}`}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{c.categoryLabel.toUpperCase()}</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{c.scheduleName}</Text>
      <Text style={{ fontSize: 15, color: colors.textMuted }}>{periodLabelId(c.period)} · jatuh tempo {formatDateId(c.dueDate)}</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginVertical: 4 }}>{formatRupiahFull(c.amount)}</Text>
      <StatusBadge status={sent ? 'claimed' : c.status} label={sent ? 'Menunggu dicek bendahara' : c.statusLabel} />
      {c.confirmed > 0 && c.status !== 'paid' ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>Sudah dibayar {formatRupiahFull(c.confirmed)}, sisa {formatRupiahFull(c.outstanding)}</Text> : null}
      {c.waivedReason ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>Keringanan: {c.waivedReason}</Text> : null}

      {canPay && !sent ? (
        open ? (
          <View style={{ marginTop: spacing.md }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Cara membayar</Text>
            {c.payInfo ? <Text selectable style={{ fontSize: 16, color: colors.text, marginVertical: 6 }}>{c.payInfo}</Text> : <Body muted>Tanyakan cara bayar ke Ketua RT atau bendahara.</Body>}
            {c.payQrUrl ? <Image source={{ uri: c.payQrUrl }} style={{ width: '100%', aspectRatio: 1, maxWidth: 280, borderRadius: 12, alignSelf: 'center', marginBottom: 8 }} contentFit="contain" accessibilityLabel="Kode QRIS untuk membayar" /> : null}
            <Body muted>Setelah membayar, laporkan di sini. Tagihan dihitung lunas setelah dicek bendahara.</Body>
            <ErrorBanner message={error} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.sm }}>Anda membayar lewat</Text>
            <Chips options={METHODS} value={method} onChange={setMethod} />
            <AmountField label="Nominal yang dibayar" value={amount} onChange={setAmount} hint={`sisa ${formatRupiahFull(room)}`} />
            <ProofPhoto url={proof} onUrl={setProof} />
            <Field label="Catatan (boleh dikosongkan)" value={note} onChangeText={setNote} maxLength={300} />
            <Button label="Saya sudah bayar" icon="checkmark-circle-outline" loading={claim.isPending} onPress={submit} />
            <Button label="Batal" variant="link" onPress={() => setOpen(false)} />
          </View>
        ) : (
          <View style={{ marginTop: spacing.sm }}><Button label="Cara bayar dan lapor" icon="wallet-outline" onPress={() => setOpen(true)} /></View>
        )
      ) : null}
    </Card>
  );
}

export default function Tagihan() {
  const q = useMyFees();
  const d = q.data;
  const unpaid = d?.items.filter((i) => i.status !== 'paid' && i.status !== 'waived') ?? [];
  const settled = d?.items.filter((i) => i.status === 'paid' || i.status === 'waived') ?? [];
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError && !d ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat tagihan. Tarik layar ke bawah untuk mencoba lagi.'} /> : null}
      {d?.hint ? <Empty title="Belum ada tagihan" hint={d.hint} /> : null}
      {d && !d.hint ? (
        <>
          <Card label={`Belum dibayar ${formatRupiahFull(d.outstanding)}`}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>Belum dibayar</Text>
            <Text style={{ fontSize: 32, fontWeight: '800', color: d.outstanding > 0 ? colors.text : colors.primary }}>{formatRupiahFull(d.outstanding)}</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>{d.outstanding > 0 ? 'Iuran dan retribusi untuk KK Anda.' : 'Semua tagihan KK Anda sudah beres. Terima kasih!'}</Text>
          </Card>
          <Button label="Lihat kas RT" icon="stats-chart-outline" variant="secondary" onPress={() => router.push('/kas-rt')} />
          {unpaid.length === 0 && settled.length === 0 ? <Empty title="Belum ada tagihan" hint="Tagihan muncul bila Ketua RT atau desa membuat iuran." /> : null}
          {unpaid.length > 0 ? <SectionTitle>PERLU DIBAYAR</SectionTitle> : null}
          {unpaid.map((c) => <ChargeCard key={c.id} c={c} />)}
          {settled.length > 0 ? <SectionTitle>RIWAYAT</SectionTitle> : null}
          {settled.map((c) => <ChargeCard key={c.id} c={c} />)}
        </>
      ) : null}
    </Screen>
  );
}
