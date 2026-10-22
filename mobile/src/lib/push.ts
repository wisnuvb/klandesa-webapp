import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { post } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/**
 * Daftarkan token push ke server. `ask: false` hanya memperbarui token bila izin sudah diberikan
 * (dipakai saat app dibuka); `ask: true` boleh memunculkan dialog izin — panggil pada momen yang masuk akal
 * (mis. setelah warga mengirim surat pertama), bukan saat pendaftaran.
 */
export async function registerPush({ ask }: { ask: boolean }): Promise<'registered' | 'denied' | 'unavailable'> {
  try {
    if (!Device.isDevice) return 'unavailable';
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return 'unavailable'; // build tanpa EAS projectId (mis. dev lokal)

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Kabar & status urusan',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && ask) status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return 'denied';

    const { data: expoToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await post('/devices', { expoToken, platform: Platform.OS });
    return 'registered';
  } catch {
    return 'unavailable';
  }
}
