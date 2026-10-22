import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Body, Button, Screen, Title } from '@/components/ui';

export default function ChooseMethod() {
  const p = useLocalSearchParams<{ villageId: string; name: string; mode: string }>();
  const closed = p.mode === 'closed';

  const go = (m: 'code' | 'identity') =>
    router.push({ pathname: '/daftar/form', params: { villageId: p.villageId, name: p.name, mode: p.mode, m } });

  return (
    <Screen>
      <Title>Desa {p.name}</Title>
      {closed ? (
        <Body>Pendaftaran mandiri belum dibuka di desa ini. Silakan datang ke kantor desa untuk mendapat kode pendaftaran.</Body>
      ) : (
        <>
          <Body>Bagaimana Anda ingin mendaftar?</Body>
          <View style={{ gap: 12 }}>
            <Button label="Saya punya kode dari desa" onPress={() => go('code')} />
            <Body muted>Kode ada di lembar yang dibagikan perangkat desa atau RT.</Body>
            <Button label="Daftar dengan data diri" variant="secondary" onPress={() => go('identity')} />
            <Body muted>
              Butuh NIK, tanggal lahir, dan nama ibu kandung.{p.mode === 'approval' ? ' Pendaftaran akan diperiksa dulu oleh perangkat desa.' : ''}
            </Body>
          </View>
        </>
      )}
    </Screen>
  );
}
