import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card, Empty, SectionTitle } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { CHANGE_FIELD_OPTIONS, type ChangeFieldKey } from '@/lib/data-change';
import { timeAgoId } from '@/lib/format';
import { useCreateDataChange, useDataChanges, useFamily } from '@/lib/queries';
import { colors, spacing } from '@/theme';

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label}
      style={{ minHeight: 48, paddingHorizontal: 16, borderRadius: 24, justifyContent: 'center', backgroundColor: selected ? colors.primary : colors.primarySoft }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: selected ? '#fff' : colors.primary }}>{label}</Text>
    </Pressable>
  );
}

const STATUS_COLOR = { pending: '#8A5A00', approved: colors.primary, rejected: colors.danger } as const;

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
    <Screen footer={field ? <Button label="Kirim ke Desa" loading={create.isPending} disabled={!value.trim()} onPress={submit} /> : undefined}>
      <Body muted>Data tidak langsung berubah. Perangkat desa akan memeriksanya dulu, lalu memberi kabar.</Body>
      {family.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {sent ? <Body>Terkirim ✓ Kami akan kabari saat desa selesai memeriksa.</Body> : null}
      <ErrorBanner message={error} />

      {members.length > 1 ? (
        <>
          <SectionTitle>DATA SIAPA?</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {members.map((m) => <Chip key={m.id} label={m.id === family.data?.me ? 'Saya' : m.name} selected={who === m.id} onPress={() => setTarget(m.id)} />)}
          </View>
        </>
      ) : null}

      <SectionTitle>DATA APA YANG SALAH?</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CHANGE_FIELD_OPTIONS.map((o) => <Chip key={o.key} label={o.label} selected={field === o.key} onPress={() => { setField(o.key); setValue(''); setError(null); }} />)}
      </View>

      {opt ? (
        <View style={{ marginTop: spacing.md }}>
          <Field label={`${opt.label} yang benar`} value={value} onChangeText={setValue} hint={opt.hint}
            keyboardType={opt.numeric ? 'number-pad' : opt.phone ? 'phone-pad' : 'default'} multiline={opt.multiline} maxLength={opt.multiline ? 500 : 255} />
          <Field label="Catatan (boleh dikosongkan)" value={note} onChangeText={setNote} maxLength={300} />
          {opt.needsCheck ? <Body muted>Perubahan ini butuh pemeriksaan dokumen. Bawa KTP/KK ke kantor desa bila diminta.</Body> : null}
        </View>
      ) : null}

      <SectionTitle>PENGAJUAN SAYA</SectionTitle>
      {list.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {list.isSuccess && list.data.items.length === 0 ? <Empty title="Belum ada pengajuan" /> : null}
      {list.data?.items.map((r) => (
        <Card key={r.id} label={`${r.fieldLabel} untuk ${r.forName}. ${r.statusLabel}`}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{r.fieldLabel} · {r.forName}</Text>
          <Text style={{ fontSize: 15, color: colors.text }}>Menjadi: {r.newValue}</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: STATUS_COLOR[r.status] }}>{r.statusLabel}{r.status === 'approved' && r.applied ? ' dan sudah diperbarui' : ''}</Text>
          {r.reviewNote ? <Text style={{ fontSize: 14, color: colors.textMuted }}>Catatan desa: {r.reviewNote}</Text> : null}
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{timeAgoId(r.createdAt)}</Text>
        </Card>
      ))}
    </Screen>
  );
}
