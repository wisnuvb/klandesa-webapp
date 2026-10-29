import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { EmptyState, SectionHeader } from '@/components/cards';
import { ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatRupiahShort } from '@/lib/format';
import { useBudgetSummary } from '@/lib/queries';
import { colors, shadow, spacing } from '@/theme';

/** Batang kemajuan. Ada teks persen di dekatnya, jadi batang ini hanya hiasan bagi pembaca layar. */
function Bar({ percent, track, fill, height = 10 }: { percent: number; track: string; fill: string; height?: number }) {
  const w = Math.max(0, Math.min(100, percent));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width: `${w}%`, height, borderRadius: height / 2, backgroundColor: fill }} />
    </View>
  );
}

export default function DanaDesa() {
  const [year, setYear] = useState<number | undefined>(undefined);
  const q = useBudgetSummary(year);
  const d = q.data;
  const sm = d?.summary;
  const left = sm ? Math.max(0, sm.totalBudget - sm.totalRealized) : 0;

  return (
    <Screen background={colors.canvas} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
      {q.isError && !d ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat data. Tarik layar ke bawah untuk mencoba lagi.'} /> : null}
      {d && !d.enabled ? <EmptyState icon="lock-closed-outline" title="Ringkasan dana desa belum ditampilkan" hint="Desa Anda belum membuka informasi ini. Tanyakan ke kantor desa." /> : null}
      {d?.enabled && !sm ? <EmptyState icon="document-outline" title="Belum ada data anggaran" hint="Perangkat desa belum mengisi anggaran." /> : null}

      {d?.enabled && sm ? (
        <>
          {d.years.length > 1 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }} accessibilityRole="tablist">
              {d.years.map((y) => {
                const on = y === d.year;
                return (
                  <Pressable key={y} onPress={() => setYear(y)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`Tahun ${y}`}
                    style={{ minHeight: 44, paddingHorizontal: 20, borderRadius: 22, justifyContent: 'center', backgroundColor: on ? colors.primary : colors.bg, borderWidth: 1, borderColor: on ? colors.primary : colors.border }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: on ? '#fff' : colors.text }}>{y}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Ringkasan utama */}
          <View
            accessible
            accessibilityLabel={`Anggaran desa ${d.year}: ${formatRupiahShort(sm.totalBudget)}. Terpakai ${formatRupiahShort(sm.totalRealized)}, ${sm.percent} persen. Sisa ${formatRupiahShort(left)}.`}
            style={{ backgroundColor: colors.primaryDeep, borderRadius: 24, padding: spacing.lg, overflow: 'hidden', ...shadow.card }}
          >
            <View style={{ position: 'absolute', top: -60, right: -40, width: 170, height: 170, borderRadius: 85, borderWidth: 1, borderColor: 'rgba(235,210,142,0.28)' }} />
            <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: 0.4, color: colors.goldLight }}>ANGGARAN DESA {d.year}</Text>
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 2 }}>{formatRupiahShort(sm.totalBudget)}</Text>
            <View style={{ marginTop: spacing.md }}>
              <Bar percent={sm.percent} track="rgba(255,255,255,0.18)" fill={colors.gold} height={14} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: spacing.md, gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)' }}>Sudah terpakai</Text>
                <Text style={{ fontSize: 19, fontWeight: '800', color: '#fff' }}>{formatRupiahShort(sm.totalRealized)}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.goldLight }}>{sm.percent}%</Text>
              </View>
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)' }}>Sisa anggaran</Text>
                <Text style={{ fontSize: 19, fontWeight: '800', color: '#fff' }}>{formatRupiahShort(left)}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.goldLight }}>{Math.max(0, 100 - sm.percent)}%</Text>
              </View>
            </View>
          </View>

          <SectionHeader>Untuk apa saja</SectionHeader>
          <View style={{ backgroundColor: colors.bg, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }}>
            {sm.categories.map((c, i) => (
              <View
                key={c.name}
                accessible
                accessibilityLabel={`${c.name}: anggaran ${formatRupiahShort(c.budget)}, terpakai ${c.percent} persen`}
                style={{ padding: spacing.md, borderTopWidth: i ? 1 : 0, borderTopColor: colors.surface }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
                  <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.text }}>{c.name}</Text>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: colors.primary }}>{c.percent}%</Text>
                </View>
                <View style={{ marginVertical: 8 }}>
                  <Bar percent={c.percent} track={colors.primarySoft} fill={colors.primary} />
                </View>
                <Text style={{ fontSize: 14, color: colors.textMuted }}>{formatRupiahShort(c.realized)} dari {formatRupiahShort(c.budget)}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, backgroundColor: colors.goldSoft, borderRadius: 16, padding: spacing.md }}>
            <Ionicons name="information-circle-outline" size={22} color={colors.goldText} />
            <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, color: colors.goldText }}>Ringkasan ini berasal dari catatan anggaran desa. Untuk rincian kegiatan, tanyakan ke kantor desa.</Text>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
