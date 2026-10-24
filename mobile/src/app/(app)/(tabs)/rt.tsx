import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card, Empty } from '@/components/cards';
import { Body, ErrorBanner, Field, PageBand, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { timeAgoId } from '@/lib/format';
import { useRtRequests, useRtResidents, useRtRole, useRtSummary } from '@/lib/queries';
import { colors } from '@/theme';

type Tab = 'pengantar' | 'warga';

function Segmented({ value, onChange, badge }: { value: Tab; onChange: (t: Tab) => void; badge?: number }) {
  const items: [Tab, string][] = [['pengantar', 'Pengantar'], ['warga', 'Warga RT']];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 4, marginBottom: 12 }} accessibilityRole="tablist">
      {items.map(([k, label]) => (
        <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: value === k }}
          style={{ flex: 1, minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: value === k ? colors.primary : 'transparent' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: value === k ? '#fff' : colors.text }}>{label}{k === 'pengantar' && badge ? ` (${badge})` : ''}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Requests() {
  const [done, setDone] = useState(false);
  const q = useRtRequests(done ? 'done' : 'pending');
  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        {[['Menunggu', false], ['Sudah diputuskan', true]].map(([l, v]) => (
          <Pressable key={String(l)} onPress={() => setDone(v as boolean)} accessibilityRole="button" accessibilityState={{ selected: done === v }}
            style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center', borderWidth: 1.5, borderColor: done === v ? colors.primary : colors.border, backgroundColor: done === v ? '#E3F3EA' : colors.bg }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{l as string}</Text>
          </Pressable>
        ))}
      </View>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat pengantar.'} /> : null}
      {q.isSuccess && q.data.items.length === 0 ? <Empty title={done ? 'Belum ada yang diputuskan' : 'Tidak ada pengantar menunggu'} hint={done ? undefined : 'Permohonan warga RT Anda akan muncul di sini.'} /> : null}
      {q.data?.items.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/rt/surat/${r.id}`)} label={`${r.type} untuk ${r.name}`}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{r.type}</Text>
          <Text style={{ fontSize: 15, color: colors.text }}>{r.name}{r.onBehalf ? ' (dibuatkan keluarga)' : ''}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={2}>{r.purpose}</Text>
          <Text style={{ fontSize: 13, color: done ? colors.textMuted : '#B26A00', fontWeight: done ? '400' : '700', marginTop: 4 }}>
            {done ? `${r.rtStatus === 'approved' ? 'Disetujui' : 'Ditolak'} ${timeAgoId(r.decidedAt ?? r.createdAt)}` : `Menunggu ${timeAgoId(r.createdAt).replace(' lalu', '')}`}
          </Text>
        </Card>
      ))}
    </>
  );
}

function Residents() {
  const [text, setText] = useState('');
  const q = useRtResidents(text.trim().length >= 2 ? text.trim() : '');
  return (
    <>
      <Field label="Cari nama warga" value={text} onChangeText={setText} placeholder="Ketik minimal 2 huruf (kosong = semua)" autoCapitalize="words" />
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat warga.'} /> : null}
      {q.isSuccess && q.data.items.length === 0 ? <Empty title="Tidak ada warga ditemukan" /> : null}
      {q.data?.items.map((r) => (
        <Card key={r.id} label={`${r.name}, ${r.familyRole}`}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{r.name}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{r.familyRole} · NIK {r.nikMasked}</Text>
        </Card>
      ))}
      {q.data?.capped ? <Body muted>Menampilkan 100 pertama. Persempit dengan mengetik nama.</Body> : null}
    </>
  );
}

export default function RtTab() {
  const [tab, setTab] = useState<Tab>('pengantar');
  const role = useRtRole();
  const summary = useRtSummary(!!role);
  return (
    <Screen header={<PageBand title={role ? `RT ${role.rt}${role.rw ? ` / RW ${role.rw}` : ''}` : 'RT'} />} onRefresh={() => void summary.refetch()} refreshing={summary.isRefetching}>
      <Segmented value={tab} onChange={setTab} badge={summary.data?.pendingRequests} />
      {tab === 'pengantar' ? <Requests /> : <Residents />}
    </Screen>
  );
}
