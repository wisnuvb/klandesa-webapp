import type { ConfigContext, ExpoConfig } from 'expo/config';
// Port webapp: satu sumber di ../config/port.json (dipakai juga oleh `pnpm dev|start` dan PM2).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { port: WEB_PORT } = require('../config/port.json') as { port: number };

/**
 * applicationId HARUS sama dengan app Flutter yang sekarang di Play Store, dan di-sign dengan
 * upload key yang sama (atau di-reset lewat Play Console). Build produksi di eas.json mengisi
 * KLANDESA_ANDROID_PACKAGE=com.klandesa.klan_desa; nilai bawaan di bawah hanya untuk pengembangan
 * lokal dan preview, dan TIDAK boleh diunggah ke Play.
 */
const DEV_ANDROID_PACKAGE = 'id.klandesa.app.dev';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Klandesa',
  slug: 'klandesa',
  scheme: 'klandesa',
  version: '2.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  backgroundColor: '#FFFFFF',
  // Aset dibuat oleh scripts/generate-mobile-assets.mjs dari logo final di public/brand.
  icon: './assets/icon.png',
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0D7A70',
    },
    // Jangan ikutkan token/sesi ke backup Google (data SecureStore tidak bisa dipulihkan di perangkat lain dan bisa bocor lewat backup).
    allowBackup: false,
    package: process.env.KLANDESA_ANDROID_PACKAGE ?? DEV_ANDROID_PACKAGE,
    // versionCode harus lebih tinggi dari versi Flutter terakhir di Play Store.
    versionCode: Number(process.env.KLANDESA_VERSION_CODE ?? 1),
  },
  extra: { webPort: WEB_PORT, eas: { projectId: 'c6b5efc1-899d-45ce-b8b2-ad0e14c7c9b5' } },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-notifications', { icon: './assets/notification-icon.png', color: '#0D7A70' }],
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#FFFFFF' }],
    ['expo-image-picker', { photosPermission: 'Klandesa memakai foto yang Anda pilih untuk melampirkan laporan.', cameraPermission: 'Klandesa memakai kamera untuk memotret masalah yang Anda laporkan.' }],
    ['expo-camera', { cameraPermission: 'Klandesa memakai kamera untuk memindai QR absensi kantor desa.', recordAudioAndroid: false }],
    ['expo-location', { locationWhenInUsePermission: 'Klandesa memakai lokasi Anda hanya saat membuat laporan, agar desa tahu letak masalahnya.' }],
  ],
});
