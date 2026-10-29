import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { dialNumber } from '@/lib/format';
import { useVillageInfoSettings } from '@/lib/queries';
import { colors, spacing } from '@/theme';

type Row = { label: string; phone: string };
const MAX_ROWS = 10;

export default function PengaturanDesa() {
  const q = useVillageInfoSettings();
  const qc = useQueryClient();
  const [budgetPublic, setBudgetPublic] = useState(false);
  const [rtApproval, setRtApproval] = useState(false);
  const [scorecardPublic, setScorecardPublic] = useState(false);
  const [hours, setHours] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    setBudgetPublic(q.data.budgetPublic);
    setRtApproval(q.data.rtApproval);
    setScorecardPublic(q.data.scorecardPublic);
    setHours(q.data.serviceHours ?? '');
    setRows(q.data.emergencyContacts);
  }, [q.data]);

  const setRow = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function save() {
    const filled = rows.filter((r) => r.label.trim() || r.phone.trim());
    const bad = filled.findIndex((r) => r.label.trim().length < 2 || !dialNumber(r.phone));
    if (bad >= 0) { setError(`Nomor penting baris ${bad + 1}: isi nama (min. 2 huruf) dan nomor telepon yang benar.`); return; }
    setBusy(true); setError(null); setSaved(false);
    try {
      await api('/staff/village-info', { method: 'PATCH', body: JSON.stringify({ budgetPublic, rtApproval, scorecardPublic, serviceHours: hours, emergencyContacts: filled }) });
      await Promise.all([qc.invalidateQueries({ queryKey: ['village-info-settings'] }), qc.invalidateQueries({ queryKey: ['village-profile'] }), qc.invalidateQueries({ queryKey: ['budget-summary'] })]);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menyimpan.');
    } finally { setBusy(false); }
  }

  if (q.isLoading) return <Screen><ActivityIndicator color={colors.primary} /></Screen>;
  return (
    <Screen footer={<Button label="Simpan" loading={busy} onPress={save} />}>
      <Title>Pengaturan Info Desa</Title>
      <Body muted>Atur apa yang dilihat warga di menu Info Desa.</Body>
      <ErrorBanner message={q.isError ? 'Gagal memuat pengaturan.' : error} />
      {saved ? <Body>Tersimpan ✓</Body> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Tampilkan ringkasan Dana Desa</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Warga melihat anggaran dan realisasi per kategori (bukan transaksi satu per satu).</Text>
        </View>
        <Switch value={budgetPublic} onValueChange={setBudgetPublic} accessibilityLabel="Tampilkan ringkasan Dana Desa" trackColor={{ true: colors.primary }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Surat lewat pengantar RT</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Permohonan surat warga menunggu persetujuan Ketua RT dulu, baru masuk antrean desa. Hanya untuk RT yang sudah ditugaskan.</Text>
        </View>
        <Switch value={rtApproval} onValueChange={setRtApproval} accessibilityLabel="Surat lewat pengantar RT" trackColor={{ true: colors.primary }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Buka rapor layanan untuk umum</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Halaman publik berisi kecepatan surat dan tanggapan pengaduan (tanpa data pribadi). Mati secara bawaan; nyalakan bila desa ingin menunjukkan kinerjanya.</Text>
        </View>
        <Switch value={scorecardPublic} onValueChange={setScorecardPublic} accessibilityLabel="Buka rapor layanan untuk umum" trackColor={{ true: colors.primary }} />
      </View>

      <Field label="Jam layanan kantor desa" value={hours} onChangeText={setHours} maxLength={120} placeholder="Senin–Jumat 08.00–14.00" />

      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginTop: spacing.md }}>Nomor penting</Text>
      <Body muted>Contoh: Polsek, Puskesmas, Pemadam, Bidan desa. Maksimal {MAX_ROWS}.</Body>
      {rows.map((r, i) => (
        <View key={i} style={{ marginBottom: spacing.sm }}>
          <Field label={`Nama ${i + 1}`} value={r.label} onChangeText={(t) => setRow(i, { label: t })} maxLength={40} />
          <Field label="Nomor telepon" value={r.phone} onChangeText={(t) => setRow(i, { phone: t })} keyboardType="phone-pad" maxLength={20} />
          <Pressable onPress={() => setRows((x) => x.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={`Hapus nomor ${i + 1}`} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Hapus nomor ini</Text>
          </Pressable>
        </View>
      ))}
      {rows.length < MAX_ROWS ? <Button label="Tambah nomor penting" variant="secondary" icon="add" onPress={() => setRows((x) => [...x, { label: '', phone: '' }])} /> : null}
    </Screen>
  );
}
