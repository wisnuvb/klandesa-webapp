import { ActivityIndicator, Share, View } from 'react-native';
import { Text } from '@/components/text';

import { Card, SectionTitle } from '@/components/cards';
import { Body, Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAccountability, type Trend } from '@/lib/queries';
import { buildScorecardShare } from '@/lib/share';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

const TREND: Record<Trend, { text: string; color: string } | null> = {
  better: { text: '▲ membaik dari periode lalu', color: colors.primary },
  worse: { text: '▼ menurun dari periode lalu', color: colors.danger },
  same: { text: '● stabil', color: colors.textMuted },
  unknown: null,
};

const hours = (v: number) => (v < 48 ? `${v} jam` : `${Math.round((v / 24) * 10) / 10} hari`);

function Metric({ label, value, hint, trend }: { label: string; value: string | null; hint: string; trend?: Trend }) {
  const t = trend ? TREND[trend] : null;
  return (
    <Card label={`${label}: ${value ?? 'belum cukup data'}`}>
      <Text style={{ fontSize: 15, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 32, fontWeight: '800', color: value ? colors.text : colors.textMuted }}>{value ?? 'Belum cukup data'}</Text>
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{hint}</Text>
      {t ? <Text style={{ fontSize: 14, fontWeight: '700', color: t.color, marginTop: 4 }}>{t.text}</Text> : null}
    </Card>
  );
}

export default function Rapor() {
  const q = useAccountability();
  const { profile } = useSession();
  const d = q.data;
  const c = d?.current;
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Body muted>Seberapa cepat desa melayani warga dalam {d?.windowDays ?? 90} hari terakhir, dibanding periode sebelumnya.</Body>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError && !d ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat rapor.'} /> : null}
      {c && d ? (
        <>
          <SectionTitle>SURAT</SectionTitle>
          <Metric label="Waktu tengah penyelesaian" value={c.mail.medianHours === null ? null : hours(c.mail.medianHours)} hint={`dari ${c.mail.processed} surat yang sudah diputuskan`} trend={d.trends.mailMedianHours} />
          <Metric label="Selesai dalam 48 jam" value={c.mail.withinSlaPercent === null ? null : `${c.mail.withinSlaPercent}%`} hint="dari surat yang sudah diputuskan" trend={d.trends.mailWithinSla} />
          <Metric label="Sedang menunggu" value={String(c.mail.pending)} hint={c.mail.oldestPendingHours !== null && c.mail.pending > 0 ? `yang paling lama: ${hours(c.mail.oldestPendingHours)}` : 'tidak ada antrean'} />

          <SectionTitle>PENGADUAN</SectionTitle>
          <Metric label="Ditanggapi dalam 3 hari" value={c.reports.respondedInTimePercent === null ? null : `${c.reports.respondedInTimePercent}%`} hint={`dari ${c.reports.eligible} pengaduan yang sudah jatuh tempo atau ditanggapi`} trend={d.trends.reportsInTime} />
          <Metric label="Pelapor bilang sudah beres" value={c.reports.resolvedPercent === null ? null : `${c.reports.resolvedPercent}%`} hint={`${c.reports.resolvedYes} ya, ${c.reports.resolvedNo} belum`} trend={d.trends.reportsResolved} />

          <SectionTitle>PENGGUNAAN APLIKASI</SectionTitle>
          <Metric label="Warga yang sudah aktif" value={c.activation.percent === null ? null : `${c.activation.percent}%`} hint={`${c.activation.accounts} dari ${c.activation.residents} warga tercatat`} />
          <Metric label="Surat yang diajukan lewat aplikasi" value={c.mail.viaAppPercent === null ? null : `${c.mail.viaAppPercent}%`} hint={`${c.mail.viaApp} dari ${c.mail.total} permohonan`} />

          <View style={{ marginTop: spacing.md }}>
            <Button label="Bagikan rapor desa" icon="share-social-outline" variant="secondary"
              onPress={() => profile && void Share.share({ message: buildScorecardShare(profile.village.name, profile.village.code) })} />
            <Body muted>Tautan hanya bisa dibuka umum bila desa menyalakan “Buka rapor layanan untuk umum” di Pengaturan Info Desa.</Body>
          </View>
        </>
      ) : null}
    </Screen>
  );
}
