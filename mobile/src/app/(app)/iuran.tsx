import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, Text, View } from 'react-native';

import { Card, Empty, SectionTitle } from '@/components/cards';
import { AmountField, Chips, METHODS, ProofPhoto, StatusBadge } from '@/components/fees';
import { Body, Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, apiText, post } from '@/lib/api';
import { formatRupiahFull, parseRupiahInput, periodLabelId, shiftPeriod } from '@/lib/format';
import { useFeeCharges, useFeeClaims, useFeeSummary, useInvalidateFees, type FeeScope, type OfficerCharge, type PendingClaim } from '@/lib/queries';
import { colors, spacing } from '@/theme';

const METHOD_LABEL: Record<string, string> = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS' };

function Claim({ scope, c, onDone }: { scope: FeeScope; c: PendingClaim; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [reject, setReject] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  async function decide(decision: 'confirm' | 'reject') {
    setBusy(true); setError(null);
    try { await post(`/fees/payments/${c.id}/decision?scope=${scope}`, { decision, note: note.trim() || undefined }); onDone(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Gagal memproses.'); }
    finally { setBusy(false); }
  }
  return (
    <Card label={`Laporan bayar ${c.headName}`}>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{c.headName}</Text>
      <Text style={{ fontSize: 15, color: colors.text }}>{c.scheduleName} · {periodLabelId(c.period)}</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{formatRupiahFull(c.amount)} <Text style={{ fontSize: 14, fontWeight: '400', color: colors.textMuted }}>via {METHOD_LABEL[c.method] ?? c.method}</Text></Text>
      {c.note ? <Text style={{ fontSize: 14, color: colors.textMuted }}>Catatan: {c.note}</Text> : null}
      {c.proofUrl ? <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '700' }} onPress={() => router.push({ pathname: '/bukti', params: { url: c.proofUrl! } })} accessibilityRole="link">Lihat foto bukti</Text> : <Text style={{ fontSize: 14, color: colors.textMuted }}>Tanpa foto bukti</Text>}
      <ErrorBanner message={error} />
      {reject ? (
        <>
          <Field label="Alasan (warga akan membaca)" value={note} onChangeText={setNote} maxLength={300} />
          <Button label="Tolak laporan" variant="secondary" loading={busy} disabled={note.trim().length < 3} onPress={() => decide('reject')} />
          <Button label="Batal" variant="link" onPress={() => setReject(false)} />
        </>
      ) : (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button label="Uang sudah diterima" icon="checkmark-circle-outline" loading={busy} onPress={() => decide('confirm')} />
          <Button label="Belum diterima" variant="secondary" onPress={() => setReject(true)} />
        </View>
      )}
    </Card>
  );
}

function ChargeRow({ scope, c, onDone }: { scope: FeeScope; c: OfficerCharge; onDone: () => void }) {
  const [mode, setMode] = useState<'idle' | 'pay' | 'waive'>('idle');
  const [method, setMethod] = useState<'cash' | 'transfer' | 'qris' | null>('cash');
  const [amount, setAmount] = useState(String(c.outstanding));
  const [proof, setProof] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); setMode('idle'); onDone(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Gagal memproses.'); }
    finally { setBusy(false); }
  }
  const pay = () => {
    const n = parseRupiahInput(amount);
    if (!method || !n) return setError('Pilih cara bayar dan isi nominal.');
    void run(() => post(`/fees/charges/${c.id}/payments?scope=${scope}`, { method, amount: n, proofUrl: proof ?? undefined }));
  };
  const waive = () => Alert.alert('Bebaskan tagihan?', `${c.headName} tidak perlu membayar ${formatRupiahFull(c.amount)}. Alasan: ${reason.trim()}`, [
    { text: 'Batal', style: 'cancel' }, { text: 'Bebaskan', style: 'destructive', onPress: () => void run(() => post(`/fees/charges/${c.id}/waive?scope=${scope}`, { reason: reason.trim() })) },
  ]);
  const unwaive = () => void run(() => post(`/fees/charges/${c.id}/waive?scope=${scope}`, { undo: true }));

  return (
    <Card label={`${c.headName}, ${c.statusLabel}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.text }}>{c.headName}</Text>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{formatRupiahFull(c.amount)}</Text>
      </View>
      <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6 }}>{c.scheduleName}{c.confirmed > 0 && c.outstanding > 0 ? ` · terbayar ${formatRupiahFull(c.confirmed)}` : ''}</Text>
      <StatusBadge status={c.status} label={c.statusLabel} />
      {c.waivedReason ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }}>Keringanan: {c.waivedReason}</Text> : null}
      <ErrorBanner message={error} />

      {mode === 'idle' && c.status !== 'paid' ? (
        <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.sm }}>
          {c.status === 'waived' ? <View style={{ flex: 1 }}><Button label="Batalkan keringanan" variant="secondary" loading={busy} onPress={unwaive} /></View> : (
            <>
              <View style={{ flex: 1 }}><Button label="Catat bayar" icon="cash-outline" onPress={() => { setAmount(String(c.outstanding)); setMode('pay'); }} /></View>
              <View style={{ flex: 1 }}><Button label="Bebaskan" variant="secondary" onPress={() => setMode('waive')} /></View>
            </>
          )}
        </View>
      ) : null}

      {mode === 'pay' ? (
        <View style={{ marginTop: spacing.md }}>
          <Chips options={METHODS} value={method} onChange={setMethod} />
          <AmountField label="Nominal diterima" value={amount} onChange={setAmount} hint={`sisa ${formatRupiahFull(c.outstanding)}`} />
          <ProofPhoto label="Foto bukti/nota (boleh dilewati)" url={proof} onUrl={setProof} />
          <Button label="Simpan pembayaran" icon="checkmark-circle-outline" loading={busy} onPress={pay} />
          <Button label="Batal" variant="link" onPress={() => setMode('idle')} />
        </View>
      ) : null}
      {mode === 'waive' ? (
        <View style={{ marginTop: spacing.md }}>
          <Field label="Alasan keringanan" value={reason} onChangeText={setReason} maxLength={300} hint="Contoh: warga tidak mampu, pindah, sakit." />
          <Button label="Bebaskan tagihan" variant="secondary" loading={busy} disabled={reason.trim().length < 3} onPress={waive} />
          <Button label="Batal" variant="link" onPress={() => setMode('idle')} />
        </View>
      ) : null}
    </Card>
  );
}

export default function Iuran() {
  const { scope: raw } = useLocalSearchParams<{ scope?: string }>();
  const scope: FeeScope = raw === 'desa' ? 'desa' : 'rt';
  const [period, setPeriod] = useState(() => { const d = new Date(Date.now() + 7 * 3600_000); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; });
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const sum = useFeeSummary(scope, period);
  const charges = useFeeCharges(scope, period);
  const claims = useFeeClaims(scope);
  const refresh = useInvalidateFees();
  const [csvBusy, setCsvBusy] = useState(false);

  const s = sum.data?.summary;
  const items = (charges.data?.items ?? []).filter((c) => filter === 'all' || (c.status !== 'paid' && c.status !== 'waived'));

  async function share() {
    setCsvBusy(true);
    try {
      const text = await apiText(`/fees/report?scope=${scope}&period=${period}`);
      void Share.share({ message: text, title: `Iuran ${periodLabelId(period)}` });
    } catch { Alert.alert('Gagal', 'Laporan belum bisa disiapkan. Coba lagi.'); }
    finally { setCsvBusy(false); }
  }

  return (
    <Screen onRefresh={() => void refresh()} refreshing={charges.isRefetching}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => setPeriod(shiftPeriod(period, -1))} accessibilityRole="button" accessibilityLabel="Bulan sebelumnya" style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 26, color: colors.primary }}>‹</Text></Pressable>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }} accessibilityRole="header">{periodLabelId(period)}</Text>
        <Pressable onPress={() => setPeriod(shiftPeriod(period, 1))} accessibilityRole="button" accessibilityLabel="Bulan berikutnya" style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 26, color: colors.primary }}>›</Text></Pressable>
      </View>

      {sum.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {sum.isError ? <ErrorBanner message={sum.error instanceof ApiError ? sum.error.message : 'Gagal memuat rekap.'} /> : null}
      {s && sum.data ? (
        <Card label={`Terkumpul ${formatRupiahFull(s.collected)} dari ${formatRupiahFull(s.billed)}`}>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Terkumpul bulan ini</Text>
          <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>{formatRupiahFull(s.collected)}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{s.billed > 0 ? `dari ${formatRupiahFull(s.billed)} (${s.collectionPercent}%) · ${s.paid} lunas · ${s.overdue} lewat tempo` : 'Belum ada tagihan bulan ini.'}</Text>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Saldo kas</Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: sum.data.balance.balance < 0 ? colors.danger : colors.text }}>{formatRupiahFull(Math.abs(sum.data.balance.balance))}{sum.data.balance.balance < 0 ? ' (kurang)' : ''}</Text>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}><Button label="Jadwal iuran" icon="calendar-outline" variant="secondary" onPress={() => router.push({ pathname: '/iuran/jadwal', params: { scope } })} /></View>
        <View style={{ flex: 1 }}><Button label="Buku kas" icon="book-outline" variant="secondary" onPress={() => router.push({ pathname: '/iuran/kas', params: { scope } })} /></View>
      </View>

      {claims.data && claims.data.items.length > 0 ? (
        <>
          <SectionTitle>{`PERLU DICEK (${claims.data.items.length})`}</SectionTitle>
          {claims.data.items.map((c) => <Claim key={c.id} scope={scope} c={c} onDone={() => void refresh()} />)}
        </>
      ) : null}

      <SectionTitle>TAGIHAN</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        {([['open', 'Belum lunas'], ['all', 'Semua']] as const).map(([k, l]) => (
          <Pressable key={k} onPress={() => setFilter(k)} accessibilityRole="button" accessibilityState={{ selected: filter === k }}
            style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', borderWidth: 1.5, borderColor: filter === k ? colors.primary : colors.border, backgroundColor: filter === k ? '#E3F3EA' : colors.bg }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {charges.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {charges.isSuccess && items.length === 0 ? <Empty title={filter === 'open' ? 'Semua tagihan sudah beres' : 'Belum ada tagihan'} hint={charges.data.items.length === 0 ? 'Buat jadwal iuran lebih dulu lewat tombol Jadwal iuran.' : undefined} /> : null}
      {items.map((c) => <ChargeRow key={c.id} scope={scope} c={c} onDone={() => void refresh()} />)}

      <View style={{ marginTop: spacing.md }}>
        <Button label="Bagikan laporan bulan ini" icon="share-social-outline" variant="secondary" loading={csvBusy} onPress={share} />
        <Body muted>Laporan berisi tagihan per KK dan buku kas (format CSV) untuk disimpan atau dikirim ke pengurus.</Body>
      </View>
    </Screen>
  );
}
