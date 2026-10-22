import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * applicationId HARUS sama dengan app Flutter yang sekarang di Play Store, dan di-sign dengan
 * upload key yang sama (atau di-reset lewat Play Console). Isi KLANDESA_ANDROID_PACKAGE saat build
 * rilis; nilai bawaan di bawah hanya untuk pengembangan lokal dan TIDAK boleh diunggah ke Play.
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
  android: {
    package: process.env.KLANDESA_ANDROID_PACKAGE ?? DEV_ANDROID_PACKAGE,
    // versionCode harus lebih tinggi dari versi Flutter terakhir di Play Store.
    versionCode: Number(process.env.KLANDESA_VERSION_CODE ?? 1),
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-notifications', { color: '#1B7F4B' }],
    ['expo-image-picker', { photosPermission: 'Klandesa memakai foto yang Anda pilih untuk melampirkan laporan.', cameraPermission: 'Klandesa memakai kamera untuk memotret masalah yang Anda laporkan.' }],
    ['expo-camera', { cameraPermission: 'Klandesa memakai kamera untuk memindai QR absensi kantor desa.', recordAudioAndroid: false }],
    ['expo-location', { locationWhenInUsePermission: 'Klandesa memakai lokasi Anda hanya saat membuat laporan, agar desa tahu letak masalahnya.' }],
  ],
});
