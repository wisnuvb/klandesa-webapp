import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { MenuRow } from '@/components/cards';
import { ContactVillageButton } from '@/components/contact';
import { Body, Button, Screen, ALL_EDGES } from '@/components/ui';
import { useHome } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

export default function Saya() {
  const { profile, signOut } = useSession();
  const home = useHome();
  const isStaff = profile?.account.type === 'staff';
  const unread = home.data?.unreadNotifications ?? 0;
  const name = profile?.account.name ?? 'Saya';

  return (
    <Screen edges={ALL_EDGES} footer={<Button label="Keluar" icon="log-out-outline" variant="secondary" onPress={() => void signOut()} />}>
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: '#fff' }}>{name.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' }} accessibilityRole="header">{name}</Text>
        {profile?.account.username ? <Text style={{ fontSize: 15, color: colors.textMuted }}>@{profile.account.username}</Text> : null}
        <View style={{ marginTop: spacing.sm, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primarySoft }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>{isStaff ? 'Perangkat desa' : 'Warga'} · {profile?.village.name}</Text>
        </View>
      </View>

      <MenuRow icon="notifications-outline" title="Notifikasi" trailing={unread > 0 ? `${unread} baru` : undefined} onPress={() => router.push('/notifikasi')} />
      <MenuRow icon="information-circle-outline" title="Info desa" onPress={() => router.push('/info-desa')} />
      {!isStaff ? <MenuRow icon="people-outline" title="Keluarga saya" onPress={() => router.push('/keluarga')} /> : null}
      {!isStaff ? <MenuRow icon="gift-outline" title="Bantuan saya" onPress={() => router.push('/bantuan')} /> : null}
      {!isStaff ? <MenuRow icon="ban-outline" title="Akun diblokir di Warga" onPress={() => router.push('/warga/blokir')} /> : null}
      {!isStaff ? <MenuRow icon="trash-outline" title="Hapus akun" danger onPress={() => router.push('/hapus-akun')} /> : null}

      <View style={{ marginTop: spacing.md }}>
        <ContactVillageButton />
      </View>
      <Body muted>Pengaturan ukuran huruf menyusul.</Body>
    </Screen>
  );
}
