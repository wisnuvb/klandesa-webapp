import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { forwardRef, useEffect, useState, type ComponentRef, type ReactNode } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
  type TextInputProps, type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { colors, spacing, TOUCH_MIN } from '@/theme';

/** Untuk layar tanpa header sama sekali: ikut menghitung inset atas (status bar). */
export const ALL_EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

/** True selama keyboard tampil; dipakai agar inset bawah (bar navigasi) tidak dihitung dua kali saat mengetik. */
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/**
 * Kerangka layar. Android memakai edge-to-edge (konten tampil di belakang status bar dan bar navigasi),
 * jadi semua tepi aman dihitung di sini: atas (bila tanpa header), bawah (bar navigasi/gestur), dan kiri-kanan (landscape/notch).
 * `edges` bisa dipersempit, mis. layar yang menaruh area berwarna sendiri sampai ke tepi.
 */
export function Screen({
  children, scroll = true, footer, header, onRefresh, refreshing, edges, background = colors.bg,
}: {
  children: ReactNode; header?: ReactNode; scroll?: boolean; footer?: ReactNode; onRefresh?: () => void; refreshing?: boolean;
  edges?: readonly Edge[]; background?: string;
}) {
  const keyboard = useKeyboardVisible();
  // Inset atas ditangani header (TopBand/StackHeader), bukan Screen. Layar tanpa header harus memberi edges yang memuat 'top'.
  const base: readonly Edge[] = edges ?? ['right', 'bottom', 'left'];
  const active = keyboard ? base.filter((e) => e !== 'bottom') : base;
  const body = (
    <SafeAreaView style={[s.screen, { backgroundColor: background }]} edges={active}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[s.content, { flex: 1 }]}>{children}</View>
        )}
        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
  if (!header) return body;
  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      {header}
      {body}
    </View>
  );
}

/** Pita kepala berlatar hijau muda yang menutup area status bar. Ikon status bar tetap gelap. */
export function TopBand({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: colors.primarySoft, paddingTop: insets.top + spacing.sm, paddingBottom: spacing.md, paddingLeft: insets.left + spacing.lg, paddingRight: insets.right + spacing.lg }}>
      {children}
    </View>
  );
}

/**
 * Header untuk layar bertumpuk (pengganti header native). Dengan edge-to-edge di Android, header native
 * dan inset status bar sering tidak sinkron sehingga konten terlihat menempel/tertimpa; di sini inset dihitung sendiri.
 * Dipasang lewat opsi `header` pada Stack.
 */
export function StackHeader({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <TopBand>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 }}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Kembali" hitSlop={8}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>
        ) : null}
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: colors.text }} accessibilityRole="header" numberOfLines={1}>{title}</Text>
      </View>
    </TopBand>
  );
}

/** Pita judul tab biasa (Layanan, Absensi, dst.) dengan gaya yang sama seperti beranda. */
export function PageBand({ title }: { title: string }) {
  return (
    <TopBand>
      <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }} accessibilityRole="header">{title}</Text>
    </TopBand>
  );
}

/** Pita beranda: hijau tua dengan aksen emas. Nama desa, sapaan, dan tombol notifikasi berlencana. */
export function HomeBand({ eyebrow, greeting, unread, onBell }: { eyebrow?: string; greeting: string; unread: number; onBell: () => void }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  return (
    <View style={{ backgroundColor: colors.primaryDeep, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' }}>
      {/* Status bar putih hanya selama tab ini tampil; tab lain tetap gelap. */}
      {focused ? <StatusBar style="light" /> : null}
      <View style={{ position: 'absolute', top: -60, right: -40, width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: 'rgba(235,210,142,0.28)' }} />
      <View style={{ position: 'absolute', top: -20, right: 20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)' }} />
      <View style={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.lg, paddingLeft: insets.left + spacing.lg, paddingRight: insets.right + spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            {eyebrow ? <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: 0.3, color: colors.goldLight }} numberOfLines={1}>{eyebrow}</Text> : null}
            <Text style={{ fontSize: 25, fontWeight: '800', color: '#fff', marginTop: 2 }} accessibilityRole="header" numberOfLines={1}>{greeting}</Text>
          </View>
          <Pressable onPress={onBell} accessibilityRole="button" accessibilityLabel={`Notifikasi, ${unread} belum dibaca`} hitSlop={8}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="notifications-outline" size={25} color="#fff" />
            {unread > 0 ? (
              <View style={{ position: 'absolute', top: -2, right: -2, minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.primaryDeep, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={{ color: colors.primaryDeep, fontSize: 12, fontWeight: '800' }}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Kepala halaman bermerek: lencana ikon, judul, dan keterangan singkat. Dipakai di halaman masuk dan sejenisnya. */
export function Hero({ icon = 'home', title, subtitle }: { icon?: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={s.heroBadge}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={s.heroTitle} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={s.heroSub}>{subtitle}</Text> : null}
    </View>
  );
}

export const Title = ({ children }: { children: ReactNode }) => <Text style={s.title} accessibilityRole="header">{children}</Text>;
export const Body = ({ children, muted }: { children: ReactNode; muted?: boolean }) => (
  <Text style={[s.body, muted && { color: colors.textMuted }]}>{children}</Text>
);

type BtnProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'link';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, style }: BtnProps) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        variant === 'link' ? s.btnLink : s.btn,
        variant === 'primary' && s.btnPrimary,
        variant === 'secondary' && s.btnSecondary,
        off && { opacity: 0.5 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.primaryText : colors.primary} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {icon ? <Ionicons name={icon} size={20} color={variant === 'primary' ? colors.primaryText : colors.primary} /> : null}
          <Text style={[s.btnText, variant !== 'primary' && { color: colors.primary }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string | null; hint?: string; secret?: boolean; icon?: keyof typeof Ionicons.glyphMap };

export const Field = forwardRef<ComponentRef<typeof TextInput>, FieldProps>(function Field({ label, error, hint, secret, icon, onFocus, onBlur, ...rest }, ref) {
  const [hidden, setHidden] = useState(!!secret);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputWrap, focused && { borderColor: colors.primary, backgroundColor: colors.bg }, !!error && { borderColor: colors.danger }]}>
        {icon ? <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textMuted} style={{ marginRight: spacing.sm }} /> : null}
        <TextInput
          ref={ref}
          style={s.input}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          {...rest}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        />
        {secret ? (
          <Pressable onPress={() => setHidden((h) => !h)} accessibilityRole="button" accessibilityLabel={hidden ? 'Tampilkan password' : 'Sembunyikan password'} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
});

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={s.banner} accessibilityRole="alert">
      <Text style={s.bannerText}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.bg },
  heroBadge: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  heroSub: { fontSize: 16, lineHeight: 23, color: colors.textMuted, marginTop: spacing.xs },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  body: { fontSize: 16, lineHeight: 24, color: colors.text, marginBottom: spacing.md },
  btn: { minHeight: TOUCH_MIN, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.primarySoft, borderWidth: 1.5, borderColor: colors.primary },
  btnLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: colors.primaryText, fontSize: 18, fontWeight: '600' },
  label: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  inputWrap: {
    minHeight: TOUCH_MIN, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: spacing.md, backgroundColor: colors.surface,
  },
  input: { flex: 1, fontSize: 18, color: colors.text, paddingVertical: 12 },
  toggle: { color: colors.primary, fontSize: 16, fontWeight: '600', paddingLeft: spacing.sm },
  error: { color: colors.danger, fontSize: 14, marginTop: spacing.xs },
  hint: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  banner: { backgroundColor: '#FDECEA', borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  bannerText: { color: colors.danger, fontSize: 16, lineHeight: 22 },
});
