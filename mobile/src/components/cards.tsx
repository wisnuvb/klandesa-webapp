import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Stage, Step } from '@/lib/queries';
import { colors, spacing, TOUCH_MIN } from '@/theme';

export const STAGE_COLOR: Record<Stage, string> = {
  sent: '#B26A00',
  approved: colors.primary,
  ready: colors.primary,
  rejected: colors.danger,
  working: '#1565C0',
  done: colors.primary,
};

/** Titik progres 3 langkah: ● selesai · ◐ sedang · ○ belum · ✕ gagal. Status juga ditulis, tidak mengandalkan warna. */
export function StepDots({ states }: { states: Step['state'][] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {states.map((st, i) => (
        <View
          key={i}
          style={[
            d.dot,
            st === 'done' && { backgroundColor: colors.primary, borderColor: colors.primary },
            st === 'current' && { borderColor: '#B26A00', backgroundColor: '#F5D9A8' },
            st === 'failed' && { borderColor: colors.danger, backgroundColor: colors.danger },
          ]}
        />
      ))}
    </View>
  );
}

export function Card({ onPress, children, label }: { onPress?: () => void; children: React.ReactNode; label?: string }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [d.card, pressed && onPress ? { opacity: 0.85 } : null]}
    >
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={d.section} accessibilityRole="header">{children}</Text>;
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center' }}>{title}</Text>
      {hint ? <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}

const d = StyleSheet.create({
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.bg },
  card: { minHeight: TOUCH_MIN, backgroundColor: colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm },
  section: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
});
