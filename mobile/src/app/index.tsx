import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_VERSION, fetchRemoteConfig, needsForceUpdate, type RemoteConfig } from '@/lib/app-config';
import { colors, spacing, TOUCH_MIN } from '@/theme';

/** Layar sementara Fase 0: membuktikan app terhubung ke API dan force-update bekerja. */
export default function Welcome() {
  const [cfg, setCfg] = useState<RemoteConfig | null | undefined>(undefined);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchRemoteConfig(ctrl.signal).then(setCfg);
    return () => ctrl.abort();
  }, []);

  if (cfg === undefined) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (cfg && needsForceUpdate(APP_VERSION, cfg)) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Perbarui aplikasi</Text>
        <Text style={styles.body}>Versi ini sudah terlalu lama. Silakan perbarui lewat Play Store.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.center}>
      <Text style={styles.title}>Klandesa</Text>
      <Text style={styles.body}>Urusan desa, lewat HP.</Text>
      <View style={styles.actions}>
        <Pressable style={styles.primary} accessibilityRole="button">
          <Text style={styles.primaryText}>Masuk</Text>
        </Pressable>
      </View>
      <Text style={styles.meta}>
        v{APP_VERSION}
        {cfg === null ? ' · tidak terhubung ke server' : ''}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  body: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  actions: { alignSelf: 'stretch', marginTop: spacing.xl },
  primary: {
    minHeight: TOUCH_MIN,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: colors.primaryText, fontSize: 18, fontWeight: '600' },
  meta: { marginTop: spacing.lg, fontSize: 12, color: colors.textMuted },
});
