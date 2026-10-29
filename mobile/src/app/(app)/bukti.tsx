import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui';

/** Tampilan penuh foto bukti bayar/nota. Hanya URL HTTPS dari penyimpanan Klandesa yang ditampilkan. */
export default function Bukti() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  const ok = typeof url === 'string' && /^https:\/\//.test(url);
  return (
    <Screen>
      {ok ? <Image source={{ uri: url }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 12 }} contentFit="contain" accessibilityLabel="Foto bukti" /> : null}
    </Screen>
  );
}
