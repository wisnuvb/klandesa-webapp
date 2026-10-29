import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { MenuGroup, SectionHeader } from '@/components/cards';
import { Button, PageBand, Screen } from '@/components/ui';
import { APP_VERSION, compareVersions, fetchRemoteConfig } from '@/lib/app-config';
import { resolveApiBase } from '@/lib/api-base';
import { dialNumber } from '@/lib/format';
import { useHome, useRtRole } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, shadow, spacing } from '@/theme';

const open = (url: string) => void Linking.openURL(url);

/** Lencana kecil di kartu profil: peran dan desa. */
function Pill({ icon, label, tone = 'green' }: { icon: keyof typeof Ionicons.glyphMap; label: string; tone?: 'green' | 'gold' }) {
  const gold = tone === 'gold';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: gold ? colors.goldSoft : colors.primarySoft }}>
      <Ionicons name={icon} size={15} color={gold ? colors.goldText : colors.primary} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: gold ? colors.goldText : colors.primary }}>{label}</Text>
    </View>
  );
}

export default function Saya() {
  const { profile, signOut } = useSession();
  const home = useHome();
  const rt = useRtRole();
  const isStaff = profile?.account.type === 'staff';
  const unread = home.data?.unreadNotifications ?? 0;
  const name = profile?.account.name || 'Saya';
  const villagePhone = dialNumber(home.data?.village.phone);
  const site = resolveApiBase();
  const [update, setUpdate] = useState<{ busy: boolean; msg: string | null }>({ busy: false, msg: null });

  async function checkUpdate() {
    setUpdate({ busy: true, msg: null });
    const cfg = await fetchRemoteConfig();
    if (!cfg) return setUpdate({ busy: false, msg: 'Tidak bisa memeriksa sekarang. Periksa sinyal Anda lalu coba lagi.' });
    if (compareVersions(APP_VERSION, cfg.latestVersion) < 0) {
      setUpdate({ busy: false, msg: `Versi ${cfg.latestVersion} tersedia.` });
      return open(cfg.updateUrl);
    }
    setUpdate({ busy: false, msg: 'Anda sudah memakai versi terbaru.' });
  }

  const account = [
    { icon: 'notifications-outline' as const, title: 'Notifikasi', caption: 'Kabar surat, laporan, dan pengumuman', trailing: unread > 0 ? `${unread} baru` : undefined, onPress: () => router.push('/notifikasi') },
    ...(!isStaff ? [
      { icon: 'people-outline' as const, title: 'Keluarga Saya', caption: 'Data keluarga dan koreksi data', onPress: () => router.push('/keluarga') },
      { icon: 'gift-outline' as const, title: 'Bantuan Saya', caption: 'Program bantuan yang tercatat', onPress: () => router.push('/bantuan') },
    ] : []),
    ...(rt && !isStaff ? [{ icon: 'ribbon-outline' as const, title: `Masuk sebagai Ketua RT ${rt.rt}`, caption: 'Periksa pengantar surat warga RT Anda', onPress: () => router.push('/rt') }] : []),
  ];

  const village = [
    { icon: 'information-circle-outline' as const, title: 'Info Desa', caption: 'Kantor, perangkat, dan nomor penting', onPress: () => router.push('/info-desa') },
    ...(villagePhone ? [{ icon: 'call-outline' as const, title: 'Hubungi Kantor Desa', caption: home.data?.village.phone ?? undefined, onPress: () => open(`tel:${villagePhone}`) }] : []),
  ];

  const help = [
    ...(!isStaff ? [{ icon: 'help-circle-outline' as const, title: 'Pusat Bantuan', caption: 'Jawaban atas pertanyaan yang sering muncul', onPress: () => router.push('/pusat-bantuan') }] : []),
    ...(!isStaff ? [{ icon: 'ban-outline' as const, title: 'Akun Diblokir di Warga', caption: 'Atur akun yang Anda blokir', onPress: () => router.push('/warga/blokir') }] : []),
    ...(site ? [
      { icon: 'shield-checkmark-outline' as const, title: 'Kebijakan Privasi', external: true, onPress: () => open(`${site}/privacy-policy`) },
      { icon: 'document-text-outline' as const, title: 'Syarat Layanan', external: true, onPress: () => open(`${site}/terms-of-service`) },
    ] : []),
  ];

  return (
    <Screen
      background={colors.canvas}
      header={<PageBand title="Saya" />}
      footer={<Button label="Keluar" icon="log-out-outline" variant="secondary" onPress={() => void signOut()} />}
    >
      {/* Kartu profil */}
      <View style={{ backgroundColor: colors.bg, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center', ...shadow.card }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primaryDeep, borderWidth: 3, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: '#fff' }}>{name.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' }} accessibilityRole="header">{name}</Text>
        {profile?.account.username ? <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 2 }}>@{profile.account.username}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md }}>
          <Pill icon={isStaff ? 'briefcase-outline' : 'person-outline'} label={isStaff ? 'Perangkat desa' : 'Warga'} />
          <Pill icon="location-outline" label={profile?.village.name ?? 'Desa'} />
          {rt && !isStaff ? <Pill icon="ribbon-outline" label={`Ketua RT ${rt.rt}${rt.rw ? ` / RW ${rt.rw}` : ''}`} tone="gold" /> : null}
        </View>
      </View>

      <SectionHeader>Akun saya</SectionHeader>
      <MenuGroup items={account} />

      <SectionHeader>Desa</SectionHeader>
      <MenuGroup items={village} />

      <SectionHeader>Bantuan dan privasi</SectionHeader>
      <MenuGroup items={help} />

      {!isStaff ? (
        <View style={{ marginTop: spacing.lg }}>
          <MenuGroup items={[{ icon: 'trash-outline', title: 'Hapus Akun', caption: 'Hapus akun Anda secara permanen', danger: true, onPress: () => router.push('/hapus-akun') }]} />
        </View>
      ) : null}

      {/* Versi app */}
      <View style={{ alignItems: 'center', marginTop: spacing.lg, gap: 2 }}>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>Klandesa versi {APP_VERSION}</Text>
        <Button label={update.busy ? 'Memeriksa…' : 'Cek pembaruan'} variant="link" loading={update.busy} onPress={() => void checkUpdate()} />
        {update.msg ? <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, textAlign: 'center' }} accessibilityRole="alert">{update.msg}</Text> : null}
      </View>
    </Screen>
  );
}
