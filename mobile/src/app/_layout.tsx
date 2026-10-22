import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Screen, Title, Body } from '@/components/ui';
import { APP_VERSION, fetchRemoteConfig, needsForceUpdate } from '@/lib/app-config';
import { SessionProvider, useSession } from '@/state/session';
import { colors } from '@/theme';

function Gate() {
  const { status } = useSession();
  const [mustUpdate, setMustUpdate] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchRemoteConfig(ctrl.signal).then((cfg) => cfg && setMustUpdate(needsForceUpdate(APP_VERSION, cfg)));
    return () => ctrl.abort();
  }, []);

  if (mustUpdate) {
    return (
      <Screen>
        <Title>Perbarui aplikasi</Title>
        <Body>Versi ini sudah terlalu lama. Silakan perbarui lewat Play Store agar layanan desa tetap berjalan.</Body>
        <Text style={{ color: colors.textMuted }}>Versi terpasang: {APP_VERSION}</Text>
      </Screen>
    );
  }
  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Gate />
    </SessionProvider>
  );
}
