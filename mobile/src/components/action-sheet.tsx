import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Modal, Platform, Pressable, View } from 'react-native';
import { Text } from '@/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

export type SheetAction = { icon: keyof typeof Ionicons.glyphMap; label: string; caption?: string; danger?: boolean; onPress: () => void };

/** Lembar aksi dari bawah. Menggantikan Alert agar pilihan terlihat jelas dan serasi dengan desain aplikasi. */
export function ActionSheet({ visible, title, subtitle, actions, onClose }: { visible: boolean; title?: string; subtitle?: string; actions: SheetAction[]; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [slide] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!visible) return;
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [visible, slide]);

  function run(a: SheetAction) {
    onClose();
    // Beri waktu lembar menutup; Alert yang muncul bersamaan dengan Modal yang menutup bisa gagal tampil di iOS.
    setTimeout(a.onPress, Platform.OS === 'ios' ? 280 : 0);
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(12,42,30,0.45)', opacity: slide, justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Tutup menu" />
        <Animated.View
          style={{
            backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26,
            paddingTop: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: Math.max(insets.bottom, spacing.md),
            transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
          }}
        >
          <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.sm }} />
          {title ? (
            <View style={{ paddingHorizontal: spacing.xs, paddingBottom: spacing.sm }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }} numberOfLines={1} accessibilityRole="header">{title}</Text>
              {subtitle ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
          ) : null}
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => run(a)}
              accessibilityRole="button"
              accessibilityLabel={a.caption ? `${a.label}. ${a.caption}` : a.label}
              style={({ pressed }) => [{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs, borderRadius: 16 }, pressed && { backgroundColor: colors.surface }]}
            >
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: a.danger ? '#FDECEA' : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={a.icon} size={22} color={a.danger ? colors.danger : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: a.danger ? colors.danger : colors.text }}>{a.label}</Text>
                {a.caption ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 1 }}>{a.caption}</Text> : null}
              </View>
            </Pressable>
          ))}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [{ marginTop: spacing.sm, minHeight: 52, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, pressed && { opacity: 0.8 }]}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>Tutup</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
