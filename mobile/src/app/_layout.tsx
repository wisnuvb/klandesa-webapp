import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text as RNText, View } from 'react-native';
import { Text } from '@/components/text';

import { Screen, Title, Body, ALL_EDGES } from '@/components/ui';
import { APP_VERSION, fetchRemoteConfig, needsForceUpdate } from '@/lib/app-config';
import { installCrashReporting, reportCrash, setCrashScreen } from '@/lib/crash';
import { queryClient } from '@/lib/queries';
import { FontScaleProvider } from '@/state/font-scale';
import { SessionProvider, useSession } from '@/state/session';
import { colors } from '@/theme';

installCrashReporting();

/** Layar cadangan bila ada layar yang rusak: laporan crash dikirim otomatis, pengguna bisa mencoba lagi. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => reportCrash(error, true), [error]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg, gap: 12 }}>
      <RNText accessibilityRole="header" style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Ada yang tidak berjalan</RNText>
      <RNText style={{ fontSize: 17, lineHeight: 25, color: colors.textMuted, textAlign: 'center' }}>Maaf, layar ini gagal dibuka. Kami sudah menerima laporannya. Silakan coba lagi.</RNText>
      <Pressable onPress={retry} accessibilityRole="button" accessibilityLabel="Coba lagi" style={{ minHeight: 52, minWidth: 180, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primary, paddingHorizontal: 24 }}>
        <RNText style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Coba lagi</RNText>
      </Pressable>
    </View>
  );
}

function Gate() {
  const { status } = useSession();
  const pathname = usePathname();
  useEffect(() => setCrashScreen(pathname), [pathname]);
  const [mustUpdate, setMustUpdate] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchRemoteConfig(ctrl.signal).then((cfg) => cfg && setMustUpdate(needsForceUpdate(APP_VERSION, cfg)));
    return () => ctrl.abort();
  }, []);

  if (mustUpdate) {
    return (
      <Screen edges={ALL_EDGES}>
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
    <QueryClientProvider client={queryClient}>
      <FontScaleProvider>
        <SessionProvider>
          <StatusBar style="dark" />
          <Gate />
        </SessionProvider>
      </FontScaleProvider>
    </QueryClientProvider>
  );
}
