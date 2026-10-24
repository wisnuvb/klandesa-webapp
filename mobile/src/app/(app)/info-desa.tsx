import { router } from 'expo-router';
import { ActivityIndicator, Linking, Text, View } from 'react-native';

import { Card, Empty, MenuRow, SectionTitle } from '@/components/cards';
import { Body, Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { dialNumber } from '@/lib/format';
import { useVillageProfile } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

function call(phone: string | null) {
  const n = dialNumber(phone);
  if (n) void Linking.openURL(`tel:${n}`);
}

export default function InfoDesa() {
  const q = useVillageProfile();
  const isStaff = useSession().profile?.account.type === 'staff';
  const d = q.data;
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError && !d ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat info desa. Tarik layar ke bawah untuk mencoba lagi.'} /> : null}
      {d ? (
        <>
          <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }} accessibilityRole="header">Desa {d.village.name}</Text>
          <Body muted>Kec. {d.village.district}, {d.village.regency}, {d.village.province}</Body>

          <SectionTitle>KANTOR DESA</SectionTitle>
          <Card label="Alamat kantor desa">
            <Text style={{ fontSize: 16, color: colors.text }}>{d.village.address}{d.village.postalCode ? ` ${d.village.postalCode}` : ''}</Text>
            {d.serviceHours ? <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 6 }}>Jam layanan: {d.serviceHours}</Text> : null}
          </Card>
          {dialNumber(d.village.phone) ? <Button label="Telepon Kantor Desa" icon="call" onPress={() => call(d.village.phone)} /> : null}
          {d.village.email ? <Button label="Kirim email" icon="mail-outline" variant="secondary" onPress={() => void Linking.openURL(`mailto:${d.village.email}`)} /> : null}

          {d.emergencyContacts.length > 0 ? (
            <>
              <SectionTitle>NOMOR PENTING</SectionTitle>
              {d.emergencyContacts.map((c) => (
                <MenuRow key={`${c.label}-${c.phone}`} icon="call-outline" title={c.label} trailing={c.phone} onPress={() => call(c.phone)} />
              ))}
            </>
          ) : null}

          <SectionTitle>PERANGKAT DESA</SectionTitle>
          {d.officials.length === 0 ? <Empty title="Daftar perangkat belum diisi desa" /> : null}
          {d.officials.map((o) => (
            <Card key={o.id} label={`${o.name}, ${o.position}`}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{o.name}</Text>
              <Text style={{ fontSize: 15, color: colors.textMuted }}>{o.position}</Text>
            </Card>
          ))}

          <View style={{ marginTop: spacing.md }}>
            {d.budgetPublic ? <MenuRow icon="cash-outline" title="Dana Desa" onPress={() => router.push('/dana-desa')} /> : null}
            {!isStaff ? <MenuRow icon="gift-outline" title="Bantuan saya" onPress={() => router.push('/bantuan')} /> : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
