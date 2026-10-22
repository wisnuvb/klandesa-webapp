import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Card, Empty, SectionTitle, StepDots, STAGE_COLOR } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useReports, useRequests, useServices, type Service } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors } from '@/theme';

function ServiceCard({ s, big }: { s: Service; big?: boolean }) {
  return (
    <Card onPress={() => router.push({ pathname: '/surat/baru', params: { templateId: String(s.id), name: s.name } })} label={`Buat ${s.name}`}>
      <Text style={{ fontSize: big ? 18 : 16, fontWeight: '700', color: colors.text }}>{s.name}</Text>
      {big && s.description ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 4 }} numberOfLines={2}>{s.description}</Text> : null}
    </Card>
  );
}

export default function Layanan() {
  const { profile } = useSession();
  const services = useServices();
  const requests = useRequests();
  const reports = useReports();
  const [tab, setTab] = useState<'surat' | 'laporan'>('surat');
  const [q, setQ] = useState('');

  const { popular, rest } = useMemo(() => {
    const all = services.data?.items ?? [];
    const term = q.trim().toLowerCase();
    if (term) return { popular: [] as Service[], rest: all.filter((s) => s.name.toLowerCase().includes(term)) };
    return { popular: all.filter((s) => s.popular), rest: all };
  }, [services.data, q]);

  if (profile?.account.type !== 'citizen') {
    return (
      <Screen>
        <Title>Layanan</Title>
        <Body muted>Layanan surat untuk warga. Fitur perangkat desa menyusul.</Body>
      </Screen>
    );
  }

  const refresh = () => { void services.refetch(); void requests.refetch(); void reports.refetch(); };

  return (
    <Screen onRefresh={refresh} refreshing={services.isRefetching || requests.isRefetching}>
      <Title>Layanan</Title>
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 4, marginBottom: 16 }} accessibilityRole="tablist">
        {(['surat', 'laporan'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}
            style={{ flex: 1, minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t ? colors.primary : 'transparent' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: tab === t ? '#fff' : colors.text }}>{t === 'surat' ? 'Surat' : 'Laporan'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'laporan' ? (
        <>
          <Button label="Lapor Masalah Baru" onPress={() => router.push('/lapor/baru')} />
          <SectionTitle>LAPORAN SAYA</SectionTitle>
          {reports.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {reports.isError ? <ErrorBanner message={reports.error instanceof ApiError ? reports.error.message : 'Gagal memuat laporan.'} /> : null}
          {reports.data?.items.length === 0 ? <Empty title="Belum ada laporan" hint="Lihat jalan rusak, lampu mati, atau sampah menumpuk? Laporkan di sini." /> : null}
          {reports.data?.items.map((r) => (
            <Card key={r.id} onPress={() => router.push(`/lapor/${r.id}`)} label={`${r.title}, ${r.stageTitle}`}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{r.category.toUpperCase()}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={2}>{r.title}</Text>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>{formatDateId(r.createdAt)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <StepDots states={r.steps} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: STAGE_COLOR[r.stage] }}>{r.stageTitle}</Text>
              </View>
            </Card>
          ))}
        </>
      ) : (
        <>
      <Field label="Cari surat" value={q} onChangeText={setQ} placeholder="mis. domisili" autoCapitalize="none" />
      {services.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {services.isError ? (
        <>
          <ErrorBanner message={services.error instanceof ApiError ? services.error.message : 'Gagal memuat daftar surat.'} />
          <Button label="Coba lagi" variant="secondary" onPress={() => void services.refetch()} />
        </>
      ) : null}

      {popular.length ? (
        <>
          <SectionTitle>PALING SERING DIAJUKAN DI DESA ANDA</SectionTitle>
          {popular.map((s) => <ServiceCard key={`p${s.id}`} s={s} big />)}
        </>
      ) : null}

      <SectionTitle>{q.trim() ? 'HASIL PENCARIAN' : 'SEMUA JENIS SURAT'}</SectionTitle>
      {rest.length === 0 && !services.isLoading ? <Empty title="Surat tidak ditemukan" hint="Coba kata lain, atau tanyakan ke kantor desa." /> : null}
      {rest.map((s) => <ServiceCard key={s.id} s={s} />)}

      <SectionTitle>RIWAYAT PERMOHONAN</SectionTitle>
      {requests.data?.items.length === 0 ? <Empty title="Belum ada permohonan" /> : null}
      {requests.data?.items.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/surat/${r.id}`)} label={`${r.type}, ${r.title}`}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{r.type}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>untuk {r.forName} · {formatDateId(r.createdAt)}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <StepDots states={r.stage === 'sent' ? ['done', 'current', 'todo'] : r.stage === 'rejected' ? ['done', 'failed', 'todo'] : ['done', 'done', r.stage === 'ready' ? 'done' : 'current']} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: STAGE_COLOR[r.stage] }}>{r.title}</Text>
          </View>
        </Card>
      ))}
        </>
      )}
    </Screen>
  );
}
