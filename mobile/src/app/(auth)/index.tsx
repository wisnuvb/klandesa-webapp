import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { APP_VERSION } from '@/lib/app-config';
import { colors, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Tiga hal utama yang bisa dilakukan warga: ikon, nama pendek, dan satu penjelasan pendek. */
const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'document-text-outline', title: 'Surat Online', text: 'Tanpa antre di kantor desa' },
  { icon: 'megaphone-outline', title: 'Lapor Masalah', text: 'Foto dan kirim ke desa' },
  { icon: 'newspaper-outline', title: 'Kabar Desa', text: 'Info resmi dari desa' },
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const sides = { paddingLeft: insets.left + spacing.lg, paddingRight: insets.right + spacing.lg };
  return (
    <View style={s.root}>
      {/* Ikon status bar putih karena latar atas hijau tua. */}
      <StatusBar style={focused ? 'light' : 'dark'} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.hero, { paddingTop: insets.top + spacing.xl }, sides]}>
          <View style={s.ringBig} />
          <View style={s.ringSmall} />
          <View style={s.logoWrap}>
            <Image source={require('../../../assets/icon.png')} style={s.logo} contentFit="cover" accessibilityLabel="Logo Klandesa" />
          </View>
          <Text style={s.brand} accessibilityRole="header">Klandesa</Text>
          <View style={s.rule} />
          <Text style={s.headline}>Terhubung dengan desa Anda.</Text>
        </View>

        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm }, sides]}>
          <View style={s.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={s.feature}>
                <View style={s.featureIcon}>
                  <Ionicons name={f.icon} size={26} color={colors.primary} />
                </View>
                <Text style={s.featureTitle}>{f.title}</Text>
                <Text style={s.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>

          <View style={s.actions}>
            <Button label="Masuk" icon="log-in-outline" onPress={() => router.push('/login')} />
            <Button label="Daftar Warga Baru" variant="secondary" onPress={() => router.push('/daftar')} />
          </View>
          <Text style={s.version}>Aplikasi resmi desa Anda · v{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primaryDeep },
  hero: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xl + spacing.md, overflow: 'hidden' },
  // Lingkaran dekoratif tipis beraksen emas.
  ringBig: { position: 'absolute', top: -90, right: -70, width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: 'rgba(235,210,142,0.30)' },
  ringSmall: { position: 'absolute', bottom: 10, left: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)' },
  logoWrap: {
    width: 104, height: 104, borderRadius: 32, padding: 3, backgroundColor: colors.gold, marginBottom: spacing.md,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },
  logo: { width: '100%', height: '100%', borderRadius: 29 },
  brand: { fontSize: 40, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  rule: { width: 40, height: 3, borderRadius: 2, backgroundColor: colors.gold, marginVertical: spacing.md },
  headline: { fontSize: 21, lineHeight: 29, fontWeight: '500', color: 'rgba(255,255,255,0.92)', textAlign: 'center', maxWidth: 300 },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: spacing.lg + spacing.xs, gap: spacing.lg },
  features: { flexDirection: 'row', gap: spacing.sm },
  feature: { flex: 1, alignItems: 'center', gap: 4 },
  featureIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  featureTitle: { fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center' },
  featureText: { fontSize: 13, lineHeight: 18, color: colors.textMuted, textAlign: 'center' },
  actions: { gap: 12 },
  version: { textAlign: 'center', fontSize: 13, color: colors.textMuted },
});
