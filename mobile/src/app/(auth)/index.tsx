import { router } from 'expo-router';
import { View } from 'react-native';

import { Body, Button, Screen, Title } from '@/components/ui';
import { APP_VERSION } from '@/lib/app-config';
import { colors } from '@/theme';

export default function Welcome() {
  return (
    <Screen
      scroll={false}
      footer={
        <View style={{ gap: 12 }}>
          <Button label="Masuk" onPress={() => router.push('/login')} />
          <Button label="Daftar Warga Baru" variant="secondary" onPress={() => router.push('/daftar')} />
          <Body muted>v{APP_VERSION}</Body>
        </View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Title>Klandesa</Title>
        <Body>Urusan desa, lewat HP.</Body>
        <Body muted>Buat surat, lapor masalah, dan ikuti kabar desa Anda tanpa antre.</Body>
        <View style={{ height: 4, width: 48, backgroundColor: colors.primary, borderRadius: 2 }} />
      </View>
    </Screen>
  );
}
