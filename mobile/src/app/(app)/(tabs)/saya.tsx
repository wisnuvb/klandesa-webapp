import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Card } from '@/components/cards';
import { ContactVillageButton } from '@/components/contact';
import { Body, Button, Screen, Title } from '@/components/ui';
import { useHome } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors } from '@/theme';

export default function Saya() {
  const { profile, signOut } = useSession();
  const home = useHome();
  const isStaff = profile?.account.type === 'staff';
  const unread = home.data?.unreadNotifications ?? 0;

  return (
    <Screen footer={<Button label="Keluar" variant="secondary" onPress={() => void signOut()} />}>
      <Title>{profile?.account.name ?? 'Saya'}</Title>
      {profile?.account.username ? <Body muted>@{profile.account.username}</Body> : null}
      <Body muted>{isStaff ? 'Perangkat desa' : 'Warga'} {profile?.village.name}</Body>

      <Card onPress={() => router.push('/notifikasi')} label="Notifikasi">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.text }}>Notifikasi</Text>
          {unread > 0 ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{unread} baru</Text> : null}
        </View>
      </Card>
      {!isStaff ? (
      <Card onPress={() => router.push('/keluarga')} label="Keluarga saya">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="people-outline" size={24} color={colors.text} />
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.text }}>Keluarga saya</Text>
        </View>
      </Card>
      ) : null}
      <ContactVillageButton />
      <View style={{ height: 8 }} />
      {!isStaff ? <Button label="Hapus akun" variant="link" onPress={() => router.push('/hapus-akun')} /> : null}
      <Body muted>Bantuan sosial dan pengaturan ukuran huruf menyusul.</Body>
    </Screen>
  );
}
