import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Card, Empty, SectionTitle, StepDots, STAGE_COLOR } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useRequests, useServices, type Service } from '@/lib/queries';
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

  const refresh = () => { void services.refetch(); void requests.refetch(); };

  return (
    <Screen onRefresh={refresh} refreshing={services.isRefetching || requests.isRefetching}>
      <Title>Layanan surat</Title>
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
    </Screen>
  );
}
