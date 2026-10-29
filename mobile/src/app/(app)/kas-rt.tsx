import { ActivityIndicator, Text } from 'react-native';

import { Card, Empty, SectionTitle } from '@/components/cards';
import { Body, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId, formatRupiahFull, periodLabelId } from '@/lib/format';
import { useRtKas } from '@/lib/queries';
import { colors } from '@/theme';

export default function KasRt() {
  const q = useRtKas();
  const d = q.data;
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError && !d ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat kas RT.'} /> : null}
      {d && !d.available ? <Empty title="Kas RT belum tersedia" hint="RT Anda belum memakai pencatatan kas di aplikasi." /> : null}
      {d?.available ? (
        <>
          <Body muted>Ringkasan kas RT {d.rt}{d.rw ? ` / RW ${d.rw}` : ''}. Hanya angka total, tanpa nama pembayar.</Body>
          <Card label={`Saldo kas ${formatRupiahFull(d.balance ?? 0)}`}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>Saldo kas</Text>
            <Text style={{ fontSize: 32, fontWeight: '800', color: colors.text }}>{formatRupiahFull(d.balance ?? 0)}</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>Masuk {formatRupiahFull(d.income ?? 0)} · Keluar {formatRupiahFull(d.expense ?? 0)}</Text>
          </Card>
          <Card label={`Iuran ${periodLabelId(d.period ?? '')}`}>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>Iuran {periodLabelId(d.period ?? '')}</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>{d.collectionPercent == null ? 'Belum ada tagihan' : `${d.collectionPercent}% terkumpul`}</Text>
            {d.billed ? <Text style={{ fontSize: 14, color: colors.textMuted }}>{formatRupiahFull(d.collected ?? 0)} dari {formatRupiahFull(d.billed)}</Text> : null}
          </Card>
          <SectionTitle>PENGELUARAN 90 HARI TERAKHIR</SectionTitle>
          {d.expenses?.length === 0 ? <Empty title="Belum ada pengeluaran" /> : null}
          {d.expenses?.map((e) => (
            <Card key={e.id} label={`${e.description}, ${formatRupiahFull(e.amount)}`}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{e.description}</Text>
              <Text style={{ fontSize: 15, color: colors.text }}>{formatRupiahFull(e.amount)}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>{formatDateId(e.entryDate)}{e.hasReceipt ? ' · ada foto nota' : ''}</Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
