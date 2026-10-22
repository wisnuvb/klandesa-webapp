import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Card } from '@/components/cards';
import { Body, Button, Screen, Title } from '@/components/ui';
import { useHome } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors } from '@/theme';

export default function Saya() {
  const { profile, signOut } = useSession();
  const home = useHome();
  const unread = home.data?.unreadNotifications ?? 0;

  return (
    <Screen footer={<Button label="Keluar" variant="secondary" onPress={() => void signOut()} />}>
      <Title>{profile?.account.name ?? 'Saya'}</Title>
      {profile?.account.username ? <Body muted>@{profile.account.username}</Body> : null}
      <Body muted>Warga {profile?.village.name}</Body>

      <Card onPress={() => router.push('/notifikasi')} label="Notifikasi">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.text }}>Notifikasi</Text>
          {unread > 0 ? <Text style={{ color: colors.danger, fontWeight: '700' }}>{unread} baru</Text> : null}
        </View>
      </Card>
      <Body muted>Keluarga, bantuan, ukuran huruf, dan hapus akun menyusul pada tahap berikutnya.</Body>
    </Screen>
  );
}
