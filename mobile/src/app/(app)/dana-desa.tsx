import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card, Empty, SectionTitle } from '@/components/cards';
import { Body, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatRupiahShort } from '@/lib/format';
import { useBudgetSummary } from '@/lib/queries';
import { colors, spacing } from '@/theme';

function Bar({ percent }: { percent: number }) {
  const w = Math.max(0, Math.min(100, percent));
  return (
    <View style={{ height: 12, borderRadius: 6, backgroundColor: colors.primarySoft, overflow: 'hidden', marginTop: 8 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width: `${w}%`, height: 12, backgroundColor: colors.primary }} />
    </View>
  );
}

export default function DanaDesa() {
  const [year, setYear] = useState<number | undefined>(undefined);
  const q = useBudgetSummary(year);
  const d = q.data;
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError && !d ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat data. Tarik layar ke bawah untuk mencoba lagi.'} /> : null}
      {d && !d.enabled ? <Empty title="Ringkasan dana desa belum ditampilkan" hint="Desa Anda belum membuka informasi ini. Tanyakan ke kantor desa." /> : null}
      {d?.enabled && !d.summary ? <Empty title="Belum ada data anggaran" hint="Perangkat desa belum mengisi anggaran." /> : null}
      {d?.enabled && d.summary ? (
        <>
          {d.years.length > 1 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {d.years.map((y) => (
                <Pressable key={y} onPress={() => setYear(y)} accessibilityRole="button" accessibilityState={{ selected: y === d.year }} accessibilityLabel={`Tahun ${y}`}
                  style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: 'center', backgroundColor: y === d.year ? colors.primary : colors.primarySoft }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: y === d.year ? '#fff' : colors.primary }}>{y}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Card label={`Anggaran ${d.year}: ${formatRupiahShort(d.summary.totalBudget)}, terpakai ${d.summary.percent} persen`}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>Anggaran desa {d.year}</Text>
            <Text style={{ fontSize: 30, fontWeight: '800', color: colors.text }}>{formatRupiahShort(d.summary.totalBudget)}</Text>
            <Bar percent={d.summary.percent} />
            <Text style={{ fontSize: 15, color: colors.text, marginTop: 8 }}>Terpakai {formatRupiahShort(d.summary.totalRealized)} ({d.summary.percent}%)</Text>
          </Card>
          <SectionTitle>UNTUK APA SAJA</SectionTitle>
          {d.summary.categories.map((c) => (
            <Card key={c.name} label={`${c.name}: anggaran ${formatRupiahShort(c.budget)}, terpakai ${c.percent} persen`}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{c.name}</Text>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>{formatRupiahShort(c.realized)} dari {formatRupiahShort(c.budget)} · {c.percent}%</Text>
              <Bar percent={c.percent} />
            </Card>
          ))}
          <View style={{ marginTop: spacing.sm }}>
            <Body muted>Ringkasan ini berasal dari catatan anggaran desa. Untuk rincian kegiatan, tanyakan ke kantor desa.</Body>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
