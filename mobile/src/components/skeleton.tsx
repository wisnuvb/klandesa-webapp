import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';

import { colors } from '@/theme';

/** Kerangka postingan penuh lebar (sama bentuknya dengan PostCard) yang berdenyut pelan selagi data dimuat. */
export function PostSkeleton() {
  const [pulse] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const bar = (w: string, h = 11) => <View style={{ width: w as never, height: h, borderRadius: h / 2, backgroundColor: colors.border, marginBottom: 8 }} />;
  return (
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ opacity: pulse, backgroundColor: colors.bg, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.border }} />
        <View style={{ flex: 1 }}>{bar('40%', 13)}{bar('22%', 9)}</View>
      </View>
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.surface }} />
      <View style={{ padding: 12, paddingTop: 14 }}>
        {bar('30%', 13)}
        {bar('95%')}
        {bar('55%')}
      </View>
    </Animated.View>
  );
}

/** Kerangka grid produk 2 kolom (bentuknya sama dengan kartu produk) selagi katalog dimuat. */
export function ProductGridSkeleton({ rows = 3 }: { rows?: number }) {
  const [pulse] = useState(() => new Animated.Value(0.55));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const card = (key: number) => (
    <View key={key} style={{ width: '48%' }}>
      <View style={{ width: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: colors.border, marginBottom: 8 }} />
      <View style={{ width: '85%', height: 12, borderRadius: 6, backgroundColor: colors.border, marginBottom: 6 }} />
      <View style={{ width: '45%', height: 12, borderRadius: 6, backgroundColor: colors.border }} />
    </View>
  );
  return (
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ opacity: pulse, gap: 16 }}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{[0, 1].map((c) => card(r * 2 + c))}</View>
      ))}
    </Animated.View>
  );
}
