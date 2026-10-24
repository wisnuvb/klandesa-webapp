import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Card, Empty, SectionTitle } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, api, post } from '@/lib/api';
import { useResidentSearch, useRtAssignments, type ResidentHit } from '@/lib/queries';
import { colors, spacing } from '@/theme';

export default function RtPenugasan() {
  const list = useRtAssignments();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const hits = useResidentSearch(text.trim());
  const [picked, setPicked] = useState<ResidentHit | null>(null);
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => void qc.invalidateQueries({ queryKey: ['rt-assignments'] });

  function pick(h: ResidentHit) {
    setPicked(h); setRt(h.rt ?? ''); setRw(h.rw ?? ''); setError(null);
  }

  async function assign() {
    if (!picked) return;
    setBusy(true); setError(null);
    try {
      await post('/staff/rt-assignments', { residentId: picked.id, rt, rw: rw || undefined });
      setPicked(null); setText(''); setRt(''); setRw('');
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menyimpan.');
    } finally { setBusy(false); }
  }

  const remove = (id: number, name: string) =>
    Alert.alert('Cabut penugasan?', `${name} tidak lagi menjadi Ketua RT di aplikasi.`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Cabut', style: 'destructive', onPress: () => void api(`/staff/rt-assignments/${id}`, { method: 'DELETE' }).then(refresh).catch((e) => setError(e instanceof ApiError ? e.message : 'Gagal mencabut.')) },
    ]);

  return (
    <Screen onRefresh={() => void list.refetch()} refreshing={list.isRefetching}>
      <Body muted>Ketua RT adalah warga yang akunnya sudah aktif. Mereka memberi pengantar atas permohonan surat warga RT-nya sebelum diperiksa desa.</Body>
      <ErrorBanner message={error} />

      <SectionTitle>KETUA RT SAAT INI</SectionTitle>
      {list.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {list.isSuccess && list.data.items.length === 0 ? <Empty title="Belum ada Ketua RT" hint="Tambahkan di bawah." /> : null}
      {list.data?.items.map((a) => (
        <Card key={a.id} label={`${a.name}, RT ${a.rt}`}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{a.name}</Text>
          <Text style={{ fontSize: 15, color: colors.text }}>RT {a.rt}{a.rw ? ` / RW ${a.rw}` : ''} · NIK {a.nikMasked}</Text>
          {!a.hasAccount ? <Text style={{ fontSize: 14, color: '#B26A00', fontWeight: '600' }}>Belum punya akun aplikasi aktif</Text> : null}
          <Button label="Cabut penugasan" variant="link" onPress={() => remove(a.id, a.name)} />
        </Card>
      ))}

      <SectionTitle>TAMBAH KETUA RT</SectionTitle>
      {picked ? (
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{picked.name}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm }}>NIK {picked.nikMasked}{picked.hasApp ? '' : ' · belum punya akun aplikasi'}</Text>
          <Field label="Nomor RT" value={rt} onChangeText={setRt} keyboardType="number-pad" maxLength={4} />
          <Field label="Nomor RW (kosongkan bila tidak ada)" value={rw} onChangeText={setRw} keyboardType="number-pad" maxLength={4} />
          <Button label="Tugaskan sebagai Ketua RT" loading={busy} disabled={!rt.trim()} onPress={assign} />
          <Button label="Batal" variant="link" onPress={() => setPicked(null)} />
        </Card>
      ) : (
        <>
          <Field label="Cari warga" value={text} onChangeText={setText} placeholder="Ketik nama (min. 3 huruf)" autoCapitalize="words" />
          {hits.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {hits.data?.items.slice(0, 8).map((h) => (
            <Card key={h.id} onPress={() => pick(h)} label={`Pilih ${h.name}`}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{h.name}</Text>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>{h.relation} · {[h.rt && `RT ${h.rt}`, h.rw && `RW ${h.rw}`].filter(Boolean).join(' / ') || 'RT belum diisi'}</Text>
            </Card>
          ))}
          <View />
        </>
      )}
    </Screen>
  );
}
