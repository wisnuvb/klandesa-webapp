/** Token desain dasar. Ukuran huruf mengikuti skala "Huruf Besar" (lihat docs/MOBILE_V2_PRODUCT_SPEC.md §2). */
export const colors = {
  bg: '#FFFFFF',
  surface: '#F5F7F5',
  text: '#14231A',
  textMuted: '#4A5B50',
  primary: '#1B7F4B',
  primaryText: '#FFFFFF',
  danger: '#C62828',
  border: '#D7DED9',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** Tinggi minimum target sentuh (dp). */
export const TOUCH_MIN = 56;

export const fontSizes = {
  normal: { body: 16, title: 22 },
  large: { body: 20, title: 28 },
} as const;
