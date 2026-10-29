import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Avatar, Chip, EmptyState, InfoBox } from '@/components/cards';
import { ContactVillageButton } from '@/components/contact';
import { ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useFamily } from '@/lib/queries';
import { colors, shadow, spacing } from '@/theme';

function age(iso: string): number {
  const b = new Date(iso);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a -= 1;
  return Math.max(0, a);
}

/** Tombol aksi di kartu anggota. */
function Action({ icon, label, primary, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; primary?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1, minHeight: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 }, primary ? { backgroundColor: colors.primary } : { backgroundColor: colors.primarySoft }, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={18} color={primary ? '#fff' : colors.primary} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: primary ? '#fff' : colors.primary }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export default function Keluarga() {
  const q = useFamily();
  const members = q.data?.members ?? [];
  return (
    <Screen background={colors.canvas} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <InfoBox>Data keluarga Anda sesuai catatan desa. NIK disamarkan demi keamanan.</InfoBox>
      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat data keluarga.'} /> : null}
      {q.isSuccess && members.length === 0 ? <View style={{ marginTop: spacing.md }}><EmptyState icon="people-outline" title="Data keluarga belum tersedia" hint="Hubungi kantor desa untuk melengkapi data KK." /></View> : null}

      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        {members.map((m) => {
          const mine = m.id === q.data?.me;
          return (
            <View key={m.id} accessible={false} style={{ backgroundColor: colors.bg, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadow.card }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }} accessible accessibilityLabel={`${m.name}, ${m.relation}, ${age(m.birthDate)} tahun${mine ? ', ini Anda' : ''}`}>
                <Avatar name={m.name} size={56} tone={mine ? 'deep' : 'soft'} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{m.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip label={m.relation} tone="green" />
                    {mine ? <Chip label="Saya" tone="gold" /> : null}
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>{age(m.birthDate)} tahun</Text>
                  </View>
                </View>
              </View>
              <View style={{ marginTop: spacing.md, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="card-outline" size={18} color={colors.textMuted} />
                  <Text style={{ fontSize: 15, color: colors.text }}>NIK {m.nikMasked}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                  <Text style={{ fontSize: 15, color: colors.text }}>Lahir {formatDateId(m.birthDate)}</Text>
                </View>
              </View>
              {m.canActFor ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                  <Action primary icon="document-text-outline" label="Buat surat" onPress={() => router.push('/layanan')} />
                  <Action icon="create-outline" label="Koreksi data" onPress={() => router.push({ pathname: '/koreksi', params: { residentId: String(m.id) } })} />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={{ marginTop: spacing.lg, backgroundColor: colors.primarySoft, borderRadius: 20, padding: spacing.md, gap: spacing.sm }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Ada data yang salah?</Text>
        <Text style={{ fontSize: 15, lineHeight: 21, color: colors.textMuted }}>Ajukan koreksi, perangkat desa akan memeriksanya dulu sebelum data diubah.</Text>
        <ContactVillageButton label="Hubungi Kantor Desa" />
      </View>
    </Screen>
  );
}
