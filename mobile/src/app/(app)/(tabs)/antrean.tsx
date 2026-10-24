import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { Card, Empty } from '@/components/cards';
import { Button, ErrorBanner, PageBand, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { timeAgoId } from '@/lib/format';
import {
  useInvalidateStaff, useStaffMail, useStaffReports, useStaffSignups, useStaffSummary,
  type PendingSignup,
} from '@/lib/queries';
import { colors, spacing } from '@/theme';

type Tab = 'surat' | 'laporan' | 'pendaftaran';

function Segmented({ value, onChange, badges }: { value: Tab; onChange: (t: Tab) => void; badges: Partial<Record<Tab, number | null>> }) {
  const items: [Tab, string][] = [['surat', 'Surat'], ['laporan', 'Laporan'], ['pendaftaran', 'Pendaftaran']];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, padding: 4, marginBottom: 12 }} accessibilityRole="tablist">
      {items.map(([k, label]) => {
        const n = badges[k];
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: value === k }}
            style={{ flex: 1, minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: value === k ? colors.primary : 'transparent' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: value === k ? '#fff' : colors.text }}>{label}{n ? ` (${n})` : ''}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScopeToggle({ left, right, value, onChange }: { left: string; right: string; value: 0 | 1; onChange: (v: 0 | 1) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
      {[left, right].map((l, i) => (
        <Pressable key={l} onPress={() => onChange(i as 0 | 1)} accessibilityRole="button" accessibilityState={{ selected: value === i }}
          style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: 'center', borderWidth: 1.5, borderColor: value === i ? colors.primary : colors.border, backgroundColor: value === i ? '#E3F3EA' : colors.bg }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{l}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function MailList() {
  const [scope, setScope] = useState<0 | 1>(0);
  const q = useStaffMail(scope === 0 ? 'pending' : 'done');
  return (
    <>
      <ScopeToggle left="Menunggu" right="Selesai" value={scope} onChange={setScope} />
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat antrean surat.'} /> : null}
      {q.isSuccess && q.data.items.length === 0 ? <Empty title={scope === 0 ? 'Tidak ada surat menunggu' : 'Belum ada surat selesai'} /> : null}
      {q.data?.items.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/staff/surat/${r.id}`)} label={`${r.type} untuk ${r.name}`}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{r.type}</Text>
          <Text style={{ fontSize: 15, color: colors.text }}>{r.name}{r.onBehalf ? ' (dibuatkan keluarga)' : ''}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }} numberOfLines={2}>{r.purpose}</Text>
          <Text style={{ fontSize: 13, color: scope === 0 ? '#B26A00' : colors.textMuted, marginTop: 4, fontWeight: scope === 0 ? '700' : '400' }}>
            {scope === 0 ? `Menunggu ${timeAgoId(r.createdAt).replace(' lalu', '')}` : `${r.status === 'approved' ? 'Disetujui' : 'Ditolak'} ${timeAgoId(r.processedAt ?? r.createdAt)}`}
          </Text>
        </Card>
      ))}
    </>
  );
}

function ReportList() {
  const [scope, setScope] = useState<0 | 1>(0);
  const q = useStaffReports(scope === 0 ? 'open' : 'closed');
  return (
    <>
      <ScopeToggle left="Terbuka" right="Selesai" value={scope} onChange={setScope} />
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat antrean laporan.'} /> : null}
      {q.isSuccess && q.data.items.length === 0 ? <Empty title={scope === 0 ? 'Tidak ada laporan terbuka' : 'Belum ada laporan selesai'} /> : null}
      {q.data?.items.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/staff/lapor/${r.id}`)} label={`${r.title}, ${r.status}`}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{r.category.toUpperCase()}{r.status === 'PROCESS' ? ' · SEDANG DITANGANI' : ''}</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }} numberOfLines={2}>{r.title}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{r.reporter} · {timeAgoId(r.createdAt)}{r.photos ? ` · ${r.photos} foto` : ''}</Text>
        </Card>
      ))}
    </>
  );
}

function SignupList() {
  const q = useStaffSignups();
  const invalidate = useInvalidateStaff();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(s: PendingSignup, decision: 'approve' | 'reject') {
    setBusyId(s.id);
    setError(null);
    try {
      await post(`/staff/citizen-accounts/${s.id}`, { decision });
      invalidate();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memproses. Coba lagi.');
    } finally {
      setBusyId(null);
    }
  }
  const ask = (s: PendingSignup, decision: 'approve' | 'reject') =>
    Alert.alert(decision === 'approve' ? 'Setujui pendaftaran?' : 'Tolak pendaftaran?',
      decision === 'approve' ? `${s.name} akan bisa memakai aplikasi.` : `${s.name} bisa mendaftar ulang dengan data yang benar.`,
      [{ text: 'Batal', style: 'cancel' }, { text: decision === 'approve' ? 'Setujui' : 'Tolak', style: decision === 'approve' ? 'default' : 'destructive', onPress: () => void decide(s, decision) }]);

  return (
    <>
      <ErrorBanner message={error} />
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat pendaftaran.'} /> : null}
      {q.isSuccess && q.data.items.length === 0 ? <Empty title="Tidak ada pendaftaran menunggu" hint="Pendaftaran perlu persetujuan hanya jika desa memakai mode persetujuan." /> : null}
      {q.data?.items.map((s) => (
        <Card key={s.id}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{s.name}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>NIK {s.nikMasked} · @{s.username}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{[s.rt && `RT ${s.rt}`, s.rw && `RW ${s.rw}`].filter(Boolean).join(' / ')} {s.address}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm }}>Mendaftar {timeAgoId(s.createdAt)}</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Button label="Setujui" loading={busyId === s.id} disabled={busyId !== null} onPress={() => ask(s, 'approve')} /></View>
            <View style={{ flex: 1 }}><Button label="Tolak" variant="secondary" disabled={busyId !== null} onPress={() => ask(s, 'reject')} /></View>
          </View>
        </Card>
      ))}
    </>
  );
}

export default function Antrean() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'laporan' || params.tab === 'pendaftaran' ? params.tab : 'surat');
  const summary = useStaffSummary();
  const c = summary.data?.counts;
  const invalidate = useInvalidateStaff();

  return (
    <Screen header={<PageBand title="Antrean" />} onRefresh={invalidate} refreshing={summary.isRefetching}>
      <Segmented value={tab} onChange={setTab} badges={{ surat: c?.pendingMail, laporan: c?.newReports, pendaftaran: c?.pendingSignups }} />
      {tab === 'surat' ? <MailList /> : tab === 'laporan' ? <ReportList /> : <SignupList />}
    </Screen>
  );
}
