import { Linking } from 'react-native';

import { Button } from '@/components/ui';
import { useHome } from '@/lib/queries';

/** Tombol telepon kantor desa; tersembunyi bila desa belum mengisi nomor. */
export function ContactVillageButton({ label = 'Hubungi Kantor Desa' }: { label?: string }) {
  const phone = useHome().data?.village.phone?.replace(/[^\d+]/g, '');
  if (!phone) return null;
  return <Button label={label} variant="secondary" onPress={() => void Linking.openURL(`tel:${phone}`)} />;
}
