import { forwardRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type TextInputProps, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, TOUCH_MIN } from '@/theme';

export function Screen({ children, scroll = true, footer }: { children: ReactNode; scroll?: boolean; footer?: ReactNode }) {
  return (
    <SafeAreaView style={s.screen}>
      {scroll ? (
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      ) : (
        <View style={s.content}>{children}</View>
      )}
      {footer ? <View style={s.footer}>{footer}</View> : null}
    </SafeAreaView>
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
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, style }: BtnProps) {
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
        pressed && { opacity: 0.8 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.primaryText : colors.primary} />
      ) : (
        <Text style={[s.btnText, variant !== 'primary' && { color: colors.primary }]}>{label}</Text>
      )}
    </Pressable>
  );
}

type FieldProps = TextInputProps & { label: string; error?: string | null; hint?: string; secret?: boolean };

export const Field = forwardRef<TextInput, FieldProps>(function Field({ label, error, hint, secret, ...rest }, ref) {
  const [hidden, setHidden] = useState(!!secret);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputWrap, !!error && { borderColor: colors.danger }]}>
        <TextInput
          ref={ref}
          style={s.input}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          {...rest}
        />
        {secret ? (
          <Pressable onPress={() => setHidden((h) => !h)} accessibilityRole="button" accessibilityLabel={hidden ? 'Tampilkan password' : 'Sembunyikan password'} hitSlop={8}>
            <Text style={s.toggle}>{hidden ? 'Lihat' : 'Tutup'}</Text>
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
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  body: { fontSize: 16, lineHeight: 24, color: colors.text, marginBottom: spacing.md },
  btn: { minHeight: TOUCH_MIN, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  btnPrimary: { backgroundColor: colors.primary },
  btnSecondary: { backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.primary },
  btnLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: colors.primaryText, fontSize: 18, fontWeight: '600' },
  label: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  inputWrap: {
    minHeight: TOUCH_MIN, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: spacing.md, backgroundColor: colors.surface,
  },
  input: { flex: 1, fontSize: 18, color: colors.text, paddingVertical: 12 },
  toggle: { color: colors.primary, fontSize: 16, fontWeight: '600', paddingLeft: spacing.sm },
  error: { color: colors.danger, fontSize: 14, marginTop: spacing.xs },
  hint: { color: colors.textMuted, fontSize: 14, marginTop: spacing.xs },
  banner: { backgroundColor: '#FDECEA', borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  bannerText: { color: colors.danger, fontSize: 16, lineHeight: 22 },
});
