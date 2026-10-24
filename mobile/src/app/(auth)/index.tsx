import { Ionicons } from '@expo/vector-icons';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { APP_VERSION } from '@/lib/app-config';
import { colors, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'document-text-outline', title: 'Surat online', text: 'Ajukan surat dari rumah, pantau statusnya.' },
  { icon: 'megaphone-outline', title: 'Lapor masalah', text: 'Foto dan kirim laporan langsung ke desa.' },
  { icon: 'newspaper-outline', title: 'Kabar desa', text: 'Pengumuman dan kegiatan desa Anda.' },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  return (
    <View style={s.root}>
      {/* Ikon status bar putih karena latar atas berwarna hijau. */}
      <StatusBar style={focused ? 'light' : 'dark'} />
      <View style={[s.hero, { paddingTop: insets.top + spacing.xl, paddingLeft: insets.left + spacing.lg, paddingRight: insets.right + spacing.lg }]}>
        <View style={s.logo}>
          <Ionicons name="home" size={40} color={colors.primary} />
        </View>
        <Text style={s.brand}>Klandesa</Text>
        <Text style={s.tagline}>Desa dalam genggaman.</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.features, { paddingLeft: insets.left + spacing.lg, paddingRight: insets.right + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {FEATURES.map((f) => (
          <View key={f.title} style={s.feature}>
            <View style={s.featureIcon}>
              <Ionicons name={f.icon} size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.featureTitle}>{f.title}</Text>
              <Text style={s.featureText}>{f.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[s.actions, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm, paddingLeft: insets.left + spacing.lg, paddingRight: insets.right + spacing.lg }]}>
        <Button label="Masuk" icon="log-in-outline" onPress={() => router.push('/login')} />
        <Button label="Daftar Warga Baru" variant="secondary" onPress={() => router.push('/daftar')} />
        <Text style={s.version}>v{APP_VERSION}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.primary, paddingBottom: spacing.xl + spacing.sm,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  logo: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  brand: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  tagline: { fontSize: 18, color: 'rgba(255,255,255,0.88)', marginTop: spacing.xs },
  features: { paddingTop: spacing.lg, paddingBottom: spacing.md, gap: spacing.md },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  featureText: { fontSize: 15, lineHeight: 21, color: colors.textMuted },
  actions: { paddingTop: spacing.md, gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.bg },
  version: { textAlign: 'center', fontSize: 13, color: colors.textMuted },
});
