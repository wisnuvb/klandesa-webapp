import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { createContext, forwardRef, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Text } from '@/components/text';
import { useFontScale } from '@/state/font-scale';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { colors, spacing, TOUCH_MIN } from '@/theme';

/** Untuk layar tanpa header sama sekali: ikut menghitung inset atas (status bar). */
export const ALL_EDGES: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

/**
 * Diberi `true` oleh layout tab. Tab bar sudah menanggung inset bawah (bar gestur/navigasi) sendiri,
 * jadi `Screen` di dalamnya tidak boleh menghitungnya lagi: kalau dihitung, konten berhenti beberapa dp di atas tab bar.
 */
export const InTabsContext = createContext(false);

/** True selama keyboard tampil; dipakai agar inset bawah (bar navigasi) tidak dihitung dua kali saat mengetik. */
export function useKeyboardVisible() {
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
  const inTabs = useContext(InTabsContext);
  const base: readonly Edge[] = edges ?? ['right', 'bottom', 'left'];
  const active = keyboard || inTabs ? base.filter((e) => e !== 'bottom') : base;
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
    <DeepBand>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 }}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Kembali" hitSlop={6}
            style={{ width: 40, height: 40, borderRadius: 20, marginLeft: -spacing.xs, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
        ) : null}
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' }} accessibilityRole="header" numberOfLines={1}>{title}</Text>
      </View>
    </DeepBand>
  );
}

/** Pita judul tab (Layanan, Absensi, dst.): satu baris ramping, judul di kiri dan aksi opsional di kanan. */
export function PageBand({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <DeepBand>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 }}>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: '800', letterSpacing: -0.2, color: '#fff' }} accessibilityRole="header" numberOfLines={1}>{title}</Text>
        {right}
      </View>
    </DeepBand>
  );
}

/** Pita hijau tua rata dan ramping. Status bar putih hanya selama layar ini tampil; layar lain tetap gelap. `rounded` melengkungkan sudut bawah. */
function DeepBand({ children, rounded }: { children: ReactNode; rounded?: boolean }) {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  return (
    <View style={[{ backgroundColor: colors.primaryDeep }, rounded && { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }]}>
      {focused ? <StatusBar style="light" /> : null}
      <View style={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.sm + spacing.xs, paddingLeft: insets.left + spacing.md, paddingRight: insets.right + spacing.md }}>
        {children}
      </View>
    </View>
  );
}

/** Tombol bulat tembus pandang di pita hijau (cari, lonceng, dst.). Area sentuh 48 dp walau tampilannya 40 dp. */
export function BandButton({ icon, label, onPress, children }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; children?: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={22} color="#fff" />
      {children}
    </Pressable>
  );
}

/** Pita beranda: nama desa, sapaan, dan tombol notifikasi berlencana. */
export function HomeBand({ eyebrow, greeting, unread, onBell, rounded }: { eyebrow?: string; greeting: string; unread: number; onBell: () => void; rounded?: boolean }) {
  return (
    <DeepBand rounded={rounded}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, minHeight: 44 }}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.2, color: colors.goldLight }} numberOfLines={1}>{eyebrow}</Text> : null}
          <Text style={{ fontSize: 20, fontWeight: '800', letterSpacing: -0.2, color: '#fff' }} accessibilityRole="header" numberOfLines={1}>{greeting}</Text>
        </View>
        <BandButton icon="notifications-outline" label={`Notifikasi, ${unread} belum dibaca`} onPress={onBell}>
          {unread > 0 ? (
            <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.gold, borderWidth: 2, borderColor: colors.primaryDeep, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
              <Text style={{ color: colors.primaryDeep, fontSize: 11, fontWeight: '800' }}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </BandButton>
      </View>
    </DeepBand>
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

/** Penunjuk langkah formulir bertahap: teks "Langkah X dari Y" dan batang kemajuan. */
export function StepProgress({ pos, total }: { pos: number; total: number }) {
  return (
    <View style={{ marginBottom: spacing.md }} accessible accessibilityLabel={`Langkah ${pos} dari ${total}`}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 6 }}>Langkah {pos} dari {total}</Text>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < pos ? colors.primary : colors.border }} />
        ))}
      </View>
    </View>
  );
}

/** Layar hasil yang menenangkan: lingkaran centang, judul, dan penjelasan. `tone="saved"` untuk kiriman yang menunggu sinyal. */
export function ResultState({ title, children, tone = 'sent', icon }: { title: string; children: ReactNode; tone?: 'sent' | 'saved'; icon?: keyof typeof Ionicons.glyphMap }) {
  const saved = tone === 'saved';
  return (
    <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: saved ? colors.goldSoft : colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
        <Ionicons name={icon ?? (saved ? 'cloud-upload' : 'checkmark-circle')} size={52} color={saved ? colors.goldText : colors.primary} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.sm }} accessibilityRole="header">{title}</Text>
      {children}
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

export const Field = forwardRef<TextInputInstance, FieldProps>(function Field({ label, error, hint, secret, icon, onFocus, onBlur, ...rest }, ref) {
  const [hidden, setHidden] = useState(!!secret);
  const [focused, setFocused] = useState(false);
  const { scale } = useFontScale();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputWrap, focused && { borderColor: colors.primary, backgroundColor: colors.bg }, !!error && { borderColor: colors.danger }]}>
        {icon ? <Ionicons name={icon} size={20} color={focused ? colors.primary : colors.textMuted} style={{ marginRight: spacing.sm }} /> : null}
        <TextInput
          ref={ref}
          style={[s.input, scale > 1 && { fontSize: 18 * scale }]}
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
