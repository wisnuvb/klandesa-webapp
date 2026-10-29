import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type TextInputInstance } from 'react-native';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, post, type Tokens } from '@/lib/api';
import { useSession, type Profile } from '@/state/session';
import { colors, spacing } from '@/theme';

/** Pita atas hijau tua dengan tombol kembali, logo kecil, dan sapaan. */
function LoginBand() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  return (
    <View style={s.band}>
      {focused ? <StatusBar style="light" /> : null}
      <View style={s.ring} />
      <View style={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.lg, paddingLeft: insets.left + spacing.lg, paddingRight: insets.right + spacing.lg }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="Kembali" hitSlop={8} style={s.back}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <View style={s.bandRow}>
          <View style={s.logoWrap}>
            <Image source={require('../../../assets/icon.png')} style={s.logo} contentFit="cover" accessibilityLabel="Logo Klandesa" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title} accessibilityRole="header">Selamat datang kembali</Text>
            <Text style={s.subtitle}>Masuk untuk mengurus surat dan laporan Anda.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function Login() {
  const { signIn } = useSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  async function submit() {
    if (!identifier.trim() || !password) return setError('Isi email dan password Anda.');
    setBusy(true);
    setError(null);
    try {
      // Backend menerima email (perangkat desa) maupun username lama (warga) lewat satu kolom `identifier`.
      const r = await post<Tokens & Profile>('/auth/login', { identifier: identifier.trim(), password }, false);
      await signIn(r); // pengalihan ke beranda dilakukan oleh Stack.Protected
    } catch (e) {
      if (e instanceof ApiError && e.extra.reason === 'PENDING_VERIFY') {
        router.replace('/daftar/menunggu');
      } else {
        setError(e instanceof ApiError ? e.message : 'Terjadi kesalahan. Coba lagi.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      header={<LoginBand />}
      footer={<Button label="Masuk" icon="log-in-outline" onPress={submit} loading={busy} />}
    >
      <ErrorBanner message={error} />
      <Field
        label="Email"
        icon="mail-outline"
        placeholder="contoh: nama@email.com"
        value={identifier}
        onChangeText={setIdentifier}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <Field
        ref={passwordRef}
        label="Password"
        icon="lock-closed-outline"
        placeholder="Masukkan password Anda"
        value={password}
        onChangeText={setPassword}
        secret
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Pressable onPress={() => router.push('/lupa-password')} accessibilityRole="button" accessibilityLabel="Lupa password" hitSlop={8} style={s.forgot}>
        <Text style={s.forgotText}>Lupa password?</Text>
      </Pressable>

      <View style={s.divider} />
      <Text style={s.registerHint}>Belum punya akun?</Text>
      <Button label="Daftar Warga Baru" variant="secondary" onPress={() => router.push('/daftar')} />
    </Screen>
  );
}

const s = StyleSheet.create({
  band: { backgroundColor: colors.primaryDeep, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  ring: { position: 'absolute', top: -70, right: -50, width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(235,210,142,0.28)' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  bandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logoWrap: { width: 64, height: 64, borderRadius: 20, padding: 2, backgroundColor: colors.gold },
  logo: { width: '100%', height: '100%', borderRadius: 18 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 15, lineHeight: 21, color: 'rgba(255,255,255,0.88)', marginTop: 2 },
  forgot: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', marginTop: -spacing.xs },
  forgotText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
  registerHint: { fontSize: 16, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
});
