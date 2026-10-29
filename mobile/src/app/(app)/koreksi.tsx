import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/text';

import { Card, ChoiceChip, Chip, EmptyState, InfoBox, SectionHeader, StepTitle, type Tone } from '@/components/cards';
import { Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { CHANGE_FIELD_OPTIONS, type ChangeFieldKey } from '@/lib/data-change';
import { timeAgoId } from '@/lib/format';
import { useCreateDataChange, useDataChanges, useFamily } from '@/lib/queries';
import { colors, spacing } from '@/theme';

const STATUS: Record<'pending' | 'approved' | 'rejected', { tone: Tone; icon: 'time-outline' | 'checkmark-circle' | 'close-circle' }> = {
  pending: { tone: 'gold', icon: 'time-outline' },
  approved: { tone: 'green', icon: 'checkmark-circle' },
  rejected: { tone: 'red', icon: 'close-circle' },
};

export default function Koreksi() {
  const { residentId } = useLocalSearchParams<{ residentId?: string }>();
  const family = useFamily();
  const list = useDataChanges();
  const create = useCreateDataChange();
  const members = useMemo(() => (family.data?.members ?? []).filter((m) => m.canActFor), [family.data]);
  const [target, setTarget] = useState<number | null>(residentId ? Number(residentId) : null);
  const [field, setField] = useState<ChangeFieldKey | null>(null);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const who = target ?? family.data?.me ?? null;
  const opt = CHANGE_FIELD_OPTIONS.find((o) => o.key === field);
  const multi = members.length > 1;
  // Penomoran langkah menyesuaikan: "Data siapa?" hanya muncul bila ada lebih dari satu orang.
  const nField = multi ? 2 : 1;

  async function submit() {
    if (!who || !field) return;
    setError(null); setSent(false);
    try {
      await create.mutateAsync({ residentId: who, field, value, note: note.trim() || undefined });
      setValue(''); setNote(''); setField(null); setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal mengirim. Coba lagi.');
    }
  }

  return (
    <Screen background={colors.canvas} footer={field ? <Button label="Kirim ke Desa" loading={create.isPending} disabled={!value.trim()} onPress={submit} /> : undefined}>
      <InfoBox>Data tidak langsung berubah. Perangkat desa akan memeriksanya dulu, lalu memberi kabar.</InfoBox>
      {family.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} /> : null}
      {sent ? <View style={{ marginTop: spacing.md }}><InfoBox tone="ok">Terkirim. Kami akan kabari saat desa selesai memeriksa.</InfoBox></View> : null}
      <ErrorBanner message={error} />

      {multi ? (
        <>
          <StepTitle n={1}>Data siapa?</StepTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
            {members.map((m) => <ChoiceChip key={m.id} label={m.id === family.data?.me ? 'Saya' : m.name} selected={who === m.id} onPress={() => setTarget(m.id)} />)}
          </View>
        </>
      ) : null}

      <StepTitle n={nField}>Data apa yang salah?</StepTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
        {CHANGE_FIELD_OPTIONS.map((o) => <ChoiceChip key={o.key} label={o.label} selected={field === o.key} onPress={() => { setField(o.key); setValue(''); setError(null); setSent(false); }} />)}
      </View>

      {opt ? (
        <>
          <StepTitle n={nField + 1}>Isi yang benar</StepTitle>
          <Field label={`${opt.label} yang benar`} value={value} onChangeText={setValue} hint={opt.hint}
            placeholder={`Tulis ${opt.label.toLowerCase()} yang benar`}
            keyboardType={opt.numeric ? 'number-pad' : opt.phone ? 'phone-pad' : 'default'} multiline={opt.multiline} maxLength={opt.multiline ? 500 : 255} />
          <Field label="Catatan (boleh dikosongkan)" value={note} onChangeText={setNote} maxLength={300} placeholder="Alasan atau keterangan tambahan" />
          {opt.needsCheck ? <InfoBox tone="warn" icon="document-text-outline">Perubahan ini butuh pemeriksaan dokumen. Bawa KTP/KK ke kantor desa bila diminta.</InfoBox> : null}
        </>
      ) : null}

      <SectionHeader>Pengajuan saya</SectionHeader>
      {list.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {list.isSuccess && list.data.items.length === 0 ? <EmptyState icon="create-outline" title="Belum ada pengajuan" hint="Pengajuan koreksi Anda akan tampil di sini beserta statusnya." /> : null}
      {list.data?.items.map((r) => {
        const st = STATUS[r.status];
        return (
          <Card key={r.id} label={`${r.fieldLabel} untuk ${r.forName}. ${r.statusLabel}`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: colors.text }}>{r.fieldLabel}</Text>
              <Chip label={r.statusLabel + (r.status === 'approved' && r.applied ? ' · diperbarui' : '')} tone={st.tone} icon={st.icon} />
            </View>
            <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>untuk {r.forName}</Text>
            <Text style={{ fontSize: 16, color: colors.text, marginTop: 8 }}>Menjadi: <Text style={{ fontWeight: '700' }}>{r.newValue}</Text></Text>
            {r.reviewNote ? <Text style={{ fontSize: 14, lineHeight: 20, color: colors.textMuted, marginTop: 6 }}>Catatan desa: {r.reviewNote}</Text> : null}
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>{timeAgoId(r.createdAt)}</Text>
          </Card>
        );
      })}
    </Screen>
  );
}
