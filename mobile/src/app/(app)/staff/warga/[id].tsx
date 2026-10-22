import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Share, Text, View } from 'react-native';

import { Card } from '@/components/cards';
import { Body, Button, ErrorBanner, Screen, Title } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useResidentDetail } from '@/lib/queries';
import { colors, spacing } from '@/theme';

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{k}</Text>
      <Text style={{ fontSize: 17, color: colors.text }}>{v}</Text>
    </View>
  );
}

export default function WargaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numId = Number(id);
  const q = useResidentDetail(numId);
  const [full, setFull] = useState<{ nik: string; kk: string | null } | null>(null);
  const [code, setCode] = useState<{ code: string; purpose: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(key: string, fn: () => Promise<T>, ok: (v: T) => void) {
    setBusy(key);
    setError(null);
    try {
      ok(await fn());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal memproses. Coba lagi.');
    } finally {
      setBusy(null);
    }
  }

  if (q.isLoading) return <Screen><ActivityIndicator color={colors.primary} /></Screen>;
  if (q.isError || !q.data) {
    return (
      <Screen>
        <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat data warga.'} />
        <Button label="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </Screen>
    );
  }
  const r = q.data;
  const hasApp = !!r.app;

  return (
    <Screen>
      <Title>{r.name}</Title>
      <Body muted>{r.relation} · {r.gender} · {r.age} tahun{r.alive ? '' : ' · meninggal'}{r.moved ? ' · sudah pindah' : ''}</Body>
      <ErrorBanner message={error} />

      <Row k="NIK" v={full?.nik ?? r.nikMasked} />
      <Row k="No. KK" v={full ? full.kk : r.kkMasked} />
      {!full ? (
        <Button label="Tampilkan NIK & KK lengkap" variant="link" loading={busy === 'nik'}
          onPress={() => void run('nik', () => post<{ nik: string; kk: string | null }>(`/staff/residents/${numId}/reveal-nik`, {}), setFull)} />
      ) : <Body muted>Tindakan ini tercatat di log audit desa.</Body>}

      <Row k="Tempat, tanggal lahir" v={`${r.birthplace}, ${formatDateId(r.birthDate)}`} />
      <Row k="Agama · Status" v={`${r.religion} · ${r.maritalStatus}`} />
      <Row k="Pekerjaan · Pendidikan" v={[r.occupation, r.education].filter(Boolean).join(' · ') || null} />
      <Row k="Alamat" v={`${r.address}${r.rt ? `, RT ${r.rt}` : ''}${r.rw ? `/RW ${r.rw}` : ''}${r.hamlet ? `, ${r.hamlet}` : ''}`} />
      {r.phone ? <Button label={`Telepon ${r.phone}`} variant="secondary" onPress={() => void Linking.openURL(`tel:${r.phone!.replace(/[^\d+]/g, '')}`)} /> : null}

      {r.family.length ? (
        <>
          <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm }}>ANGGOTA KELUARGA LAIN</Text>
          {r.family.map((f) => (
            <Card key={f.id}><Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{f.name}</Text><Text style={{ fontSize: 14, color: colors.textMuted }}>{f.relation} · {f.age} tahun</Text></Card>
          ))}
        </>
      ) : null}

      <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm }}>AKUN APLIKASI</Text>
      <Body>{hasApp ? `Sudah punya akun (${r.app!.status === 'ACTIVE' ? 'aktif' : r.app!.status}).` : 'Belum punya akun aplikasi.'}</Body>

      {code ? (
        <View style={{ backgroundColor: '#E3F3EA', borderRadius: 14, padding: spacing.md, marginTop: spacing.sm }}>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{code.purpose === 'RESET' ? 'Kode reset password' : 'Kode pendaftaran keluarga'} (tampil sekali ini)</Text>
          <Text selectable style={{ fontSize: 36, fontWeight: '800', letterSpacing: 4, color: colors.text, marginVertical: 6 }}>{code.code}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>Berlaku sampai {formatDateId(code.expiresAt)}. Berikan langsung kepada warga.</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}><Button label="Salin" variant="secondary" onPress={() => void Clipboard.setStringAsync(code.code)} /></View>
            <View style={{ flex: 1 }}><Button label="Bagikan" variant="secondary" onPress={() => void Share.share({ message: `Kode ${code.purpose === 'RESET' ? 'reset password' : 'pendaftaran'} Klandesa: ${code.code}` })} /></View>
          </View>
        </View>
      ) : r.canManageAccess ? (
        hasApp ? (
          <Button label="Buat kode reset password" variant="secondary" loading={busy === 'code'}
            onPress={() => void run('code', () => post<{ code: string; purpose: string; expiresAt: string }>('/staff/activation-codes', { purpose: 'RESET', residentId: numId }), setCode)} />
        ) : (
          <Button label="Buat kode pendaftaran untuk KK ini" variant="secondary" loading={busy === 'code'}
            onPress={() => void run('code', () => post<{ code: string; purpose: string; expiresAt: string }>('/staff/activation-codes', { purpose: 'ACTIVATE', residentId: numId }), setCode)} />
        )
      ) : null}
    </Screen>
  );
}
