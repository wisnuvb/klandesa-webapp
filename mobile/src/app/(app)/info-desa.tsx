import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { Text } from '@/components/text';

import { EmptyState, MenuGroup, SectionHeader } from '@/components/cards';
import { ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { dialNumber } from '@/lib/format';
import { useVillageProfile } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, shadow, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const open = (url: string) => void Linking.openURL(url);
const call = (phone: string | null) => {
  const n = dialNumber(phone);
  if (n) open(`tel:${n}`);
};
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');

/** Kartu putih bergaris tipis dengan bayangan lembut; pembungkus semua blok di layar ini. */
const Panel = ({ children }: { children: React.ReactNode }) => (
  <View style={{ backgroundColor: colors.bg, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }}>{children}</View>
);

/** Baris keterangan berikon (alamat, jam layanan) di dalam kartu kantor. */
function InfoLine({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 16, lineHeight: 22, color: colors.text, marginTop: 1 }}>{children}</Text>
      </View>
    </View>
  );
}

/** Tombol aksi kontak berikon. `primary` dipakai untuk telepon, aksi yang paling sering dibutuhkan. */
function ContactAction({ icon, label, primary, onPress }: { icon: IconName; label: string; primary?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1, minHeight: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: spacing.sm }, primary ? { backgroundColor: colors.primary } : { backgroundColor: colors.primarySoft, borderWidth: 1.5, borderColor: colors.primary }, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={20} color={primary ? '#fff' : colors.primary} />
      <Text style={{ fontSize: 16, fontWeight: '700', color: primary ? '#fff' : colors.primary }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

export default function InfoDesa() {
  const q = useVillageProfile();
  const isStaff = useSession().profile?.account.type === 'staff';
  const d = q.data;
  const v = d?.village;
  const phone = dialNumber(v?.phone);
  const fullAddress = v ? [v.address, v.postalCode].filter(Boolean).join(', ') : '';

  const services: { icon: IconName; title: string; caption: string; onPress: () => void }[] = [];
  if (d?.budgetPublic) services.push({ icon: 'cash-outline', title: 'Dana Desa', caption: 'Lihat penggunaan dana desa', onPress: () => router.push('/dana-desa') });
  if (!isStaff) services.push({ icon: 'gift-outline', title: 'Bantuan Saya', caption: 'Program bantuan yang Anda terima', onPress: () => router.push('/bantuan') });

  return (
    <Screen background={colors.canvas} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /> : null}
      {q.isError && !d ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat info desa. Tarik layar ke bawah untuk mencoba lagi.'} /> : null}

      {d && v ? (
        <>
          {/* Identitas desa */}
          <View style={{ backgroundColor: colors.primaryDeep, borderRadius: 24, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, overflow: 'hidden', ...shadow.card }}>
            <View style={{ position: 'absolute', top: -50, right: -30, width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(235,210,142,0.28)' }} />
            <View style={{ width: 68, height: 68, borderRadius: 22, backgroundColor: '#fff', borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {v.logoUrl ? (
                <Image source={{ uri: v.logoUrl }} style={{ width: '100%', height: '100%' }} contentFit="contain" accessibilityLabel={`Logo Desa ${v.name}`} />
              ) : (
                <Ionicons name="home" size={32} color={colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: 0.4, color: colors.goldLight }}>PEMERINTAH DESA</Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 1 }} accessibilityRole="header">{v.name}</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.86)', marginTop: 2 }}>Kec. {v.district} · {v.regency}, {v.province}</Text>
            </View>
          </View>

          {/* Kantor desa */}
          <SectionHeader>Kantor desa</SectionHeader>
          <Panel>
            <View style={{ padding: spacing.md, gap: spacing.md }}>
              <InfoLine icon="location-outline" label="Alamat">{fullAddress || 'Belum diisi desa'}</InfoLine>
              {d.serviceHours ? <InfoLine icon="time-outline" label="Jam layanan">{d.serviceHours}</InfoLine> : null}
            </View>
            {phone || v.email || v.website || fullAddress ? (
              <View style={{ padding: spacing.md, paddingTop: 0, gap: spacing.sm }}>
                {phone ? <ContactAction primary icon="call" label="Telepon Kantor Desa" onPress={() => call(v.phone)} /> : null}
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {fullAddress ? <ContactAction icon="map-outline" label="Peta" onPress={() => open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name}, ${fullAddress}`)}`)} /> : null}
                  {v.email ? <ContactAction icon="mail-outline" label="Email" onPress={() => open(`mailto:${v.email}`)} /> : null}
                  {v.website ? <ContactAction icon="globe-outline" label="Situs" onPress={() => open(/^https?:\/\//i.test(v.website!) ? v.website! : `https://${v.website}`)} /> : null}
                </View>
              </View>
            ) : null}
          </Panel>

          {/* Nomor penting */}
          {d.emergencyContacts.length > 0 ? (
            <>
              <SectionHeader>Nomor penting</SectionHeader>
              <Panel>
                {d.emergencyContacts.map((c, i) => (
                  <Pressable
                    key={`${c.label}-${c.phone}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Telepon ${c.label}, ${c.phone}`}
                    onPress={() => call(c.phone)}
                    style={({ pressed }) => [{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: i ? 1 : 0, borderTopColor: colors.surface }, pressed && { backgroundColor: colors.surface }]}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: '#FDECEA', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{c.label}</Text>
                      <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 1 }}>{c.phone}</Text>
                    </View>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="call" size={20} color="#fff" />
                    </View>
                  </Pressable>
                ))}
              </Panel>
            </>
          ) : null}

          {/* Perangkat desa */}
          <SectionHeader>Perangkat desa</SectionHeader>
          {d.officials.length === 0 ? (
            <EmptyState icon="people-outline" title="Daftar perangkat belum diisi" hint="Desa belum menambahkan data perangkat." />
          ) : (
            <Panel>
              {d.officials.map((o, i) => (
                <View
                  key={o.id}
                  accessible
                  accessibilityLabel={`${o.name}, ${o.position}`}
                  style={{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderTopWidth: i ? 1 : 0, borderTopColor: colors.surface }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {o.photoUrl ? (
                      <Image source={{ uri: o.photoUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.primary }}>{initials(o.name)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{o.name}</Text>
                    <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 1 }}>{o.position}</Text>
                  </View>
                </View>
              ))}
            </Panel>
          )}

          {services.length ? (
            <>
              <SectionHeader>Layanan lainnya</SectionHeader>
              <MenuGroup items={services} />
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
