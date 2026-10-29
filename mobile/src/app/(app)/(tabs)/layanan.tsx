import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/text';

import { Card, Chip, EmptyState, SectionHeader, StepDots, STAGE_COLOR } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, PageBand, Screen, Title, ALL_EDGES } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useReports, useRequests, useServices, type Service } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, shadow, spacing } from '@/theme';

const openService = (s: Service) => router.push({ pathname: '/surat/baru', params: { templateId: String(s.id), name: s.name } });

/** Surat yang paling sering diajukan: ikon, nama, penjelasan singkat. Satu ketukan langsung ke formulir. */
function FeaturedService({ s }: { s: Service }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buat ${s.name}`}
      onPress={() => openService(s)}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg, borderRadius: 18, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadow.card }, pressed && { opacity: 0.88 }]}
    >
      <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="document-text" size={26} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{s.name}</Text>
        {s.description ? <Text style={{ fontSize: 14, lineHeight: 19, color: colors.textMuted, marginTop: 2 }} numberOfLines={2}>{s.description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

/** Daftar ringkas satu kartu: baris dipisah garis tipis supaya banyak pilihan tetap mudah dipindai. */
function ServiceList({ items }: { items: Service[] }) {
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }}>
      {items.map((s, i) => (
        <Pressable
          key={s.id}
          accessibilityRole="button"
          accessibilityLabel={`Buat ${s.name}`}
          onPress={() => openService(s)}
          style={({ pressed }) => [{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderTopWidth: i ? 1 : 0, borderTopColor: colors.surface }, pressed && { backgroundColor: colors.surface }]}
        >
          <Ionicons name="document-text-outline" size={22} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, paddingVertical: 12 }}>{s.name}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
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
      <Screen edges={ALL_EDGES}>
        <Title>Layanan</Title>
        <Body muted>Layanan surat untuk warga. Fitur perangkat desa menyusul.</Body>
      </Screen>
    );
  }

  const refresh = () => { void services.refetch(); void requests.refetch(); void reports.refetch(); };

  return (
    <Screen background={colors.canvas} header={<PageBand title="Layanan" />} onRefresh={refresh} refreshing={services.isRefetching || requests.isRefetching}>
      <View style={{ flexDirection: 'row', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 4, marginBottom: 8 }} accessibilityRole="tablist">
        {(['surat', 'laporan'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}
            style={{ flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t ? colors.primary : 'transparent' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: tab === t ? '#fff' : colors.text }}>{t === 'surat' ? 'Surat' : 'Laporan'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'laporan' ? (
        <>
          <Button label="Lapor Masalah Baru" icon="megaphone-outline" onPress={() => router.push('/lapor/baru')} style={{ marginTop: spacing.sm }} />
          <SectionHeader>Laporan saya</SectionHeader>
          {reports.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
          {reports.isError ? <ErrorBanner message={reports.error instanceof ApiError ? reports.error.message : 'Gagal memuat laporan.'} /> : null}
          {reports.data?.items.length === 0 ? <EmptyState icon="megaphone-outline" title="Belum ada laporan" hint="Lihat jalan rusak, lampu mati, atau sampah menumpuk? Laporkan lewat tombol di atas." /> : null}
          {reports.data?.items.map((r) => (
            <Card key={r.id} onPress={() => router.push(`/lapor/${r.id}`)} label={`${r.title}, ${r.stageTitle}`}>
              <Chip label={r.category.toUpperCase()} />
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 6 }} numberOfLines={2}>{r.title}</Text>
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
      <Field label="Cari surat" icon="search-outline" value={q} onChangeText={setQ} placeholder="contoh: domisili" returnKeyType="search" />
      {services.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {services.isError ? (
        <>
          <ErrorBanner message={services.error instanceof ApiError ? services.error.message : 'Gagal memuat daftar surat.'} />
          <Button label="Coba lagi" variant="secondary" onPress={() => void services.refetch()} />
        </>
      ) : null}

      {popular.length ? (
        <>
          <SectionHeader>Paling sering diajukan</SectionHeader>
          {popular.map((s) => <FeaturedService key={`p${s.id}`} s={s} />)}
        </>
      ) : null}

      <SectionHeader>{q.trim() ? 'Hasil pencarian' : 'Semua jenis surat'}</SectionHeader>
      {rest.length === 0 && !services.isLoading ? <EmptyState icon="search-outline" title="Surat tidak ditemukan" hint="Coba kata lain, atau tanyakan ke kantor desa." /> : null}
      {rest.length ? <ServiceList items={rest} /> : null}

      <SectionHeader>Riwayat permohonan</SectionHeader>
      {requests.data?.items.length === 0 ? <EmptyState icon="time-outline" title="Belum ada permohonan" hint="Surat yang Anda ajukan akan tampil di sini beserta statusnya." /> : null}
      {requests.data?.items.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/surat/${r.id}`)} label={`${r.type}, ${r.title}`}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>{r.type}</Text>
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
