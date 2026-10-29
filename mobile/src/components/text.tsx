import { createContext, useContext } from 'react';
import { StyleSheet, Text as RNText, type TextProps } from 'react-native';

import { scaledTextStyle } from '@/lib/font-scale';
import { useFontScale } from '@/state/font-scale';

const NestedText = createContext(false);

/**
 * Pengganti `Text` dari react-native: ikut pilihan "Ukuran huruf" di menu Saya. Pengaturan ukuran huruf sistem
 * tetap berlaku (allowFontScaling bawaan RN). Text bersarang tanpa fontSize mewarisi ukuran induknya.
 */
export function Text({ style, children, ...rest }: TextProps) {
  const { scale } = useFontScale();
  const nested = useContext(NestedText);
  const extra = scaledTextStyle(StyleSheet.flatten(style), scale, nested);
  return (
    <NestedText.Provider value>
      <RNText {...rest} style={extra ? [style, extra] : style}>{children}</RNText>
    </NestedText.Provider>
  );
}
