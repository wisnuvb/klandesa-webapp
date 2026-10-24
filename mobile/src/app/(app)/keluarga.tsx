import { router } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { Card, Empty } from '@/components/cards';
import { ContactVillageButton } from '@/components/contact';
import { Body, Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useFamily } from '@/lib/queries';
import { colors, spacing } from '@/theme';

function age(iso: string): number {
  const b = new Date(iso);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a -= 1;
  return Math.max(0, a);
}

export default function Keluarga() {
  const q = useFamily();
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <Body muted>Data keluarga Anda sesuai catatan desa. NIK disamarkan demi keamanan.</Body>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat data keluarga.'} /> : null}
      {q.isSuccess && q.data.members.length === 0 ? <Empty title="Data keluarga belum tersedia" hint="Hubungi kantor desa untuk melengkapi data KK." /> : null}
      {q.data?.members.map((m) => (
        <Card key={m.id} label={`${m.name}, ${m.relation}`}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{m.name}{m.id === q.data.me ? ' (saya)' : ''}</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted }}>{m.relation} · {age(m.birthDate)} tahun</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>NIK {m.nikMasked} · lahir {formatDateId(m.birthDate)}</Text>
          {m.canActFor ? (
            <View style={{ marginTop: spacing.sm }}>
              <Button label="Buat surat untuk ini" variant="secondary" onPress={() => router.push('/layanan')} />
              <Button label="Koreksi data ini" variant="link" onPress={() => router.push({ pathname: '/koreksi', params: { residentId: String(m.id) } })} />
            </View>
          ) : null}
        </Card>
      ))}
      <Body muted>Ada data yang salah? Ajukan koreksi, perangkat desa akan memeriksanya.</Body>
      <Button label="Ajukan koreksi data" onPress={() => router.push('/koreksi')} />
      <ContactVillageButton label="Hubungi Kantor Desa" />
    </Screen>
  );
}
