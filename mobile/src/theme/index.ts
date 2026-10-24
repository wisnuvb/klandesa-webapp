/** Token desain dasar. Ukuran huruf mengikuti skala "Huruf Besar" (lihat docs/MOBILE_V2_PRODUCT_SPEC.md §2). */
export const colors = {
  bg: '#FFFFFF',
  surface: '#F5F7F5',
  text: '#14231A',
  textMuted: '#4A5B50',
  primary: '#1B7F4B',
  primaryDark: '#12633A',
  primarySoft: '#E7F4EC',
  primaryText: '#FFFFFF',
  danger: '#C62828',
  border: '#D7DED9',
  /** Hijau tua pekat untuk area merek (welcome, login, pita beranda). */
  primaryDeep: '#0C4A35',
  /** Aksen emas dari daun pada logo. `goldLight` terbaca di atas hijau tua; `goldText` terbaca di atas krem. */
  gold: '#C9A24B',
  goldLight: '#EBD28E',
  goldSoft: '#F8F1DD',
  goldText: '#7A5A12',
  /** Latar krem hangat untuk layar yang berisi kartu putih. */
  canvas: '#F6F5EF',
  placeholder: '#8A978F',
} as const;

/** Bayangan lembut untuk kartu putih di atas latar krem. */
export const shadow = {
  card: { shadowColor: '#0C2A1E', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** Tinggi minimum target sentuh (dp). */
export const TOUCH_MIN = 56;

export const fontSizes = {
  normal: { body: 16, title: 22 },
  large: { body: 20, title: 28 },
} as const;
