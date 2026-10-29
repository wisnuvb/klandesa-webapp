import { router } from 'expo-router';
import { Text } from '@/components/text';

import { Button, ResultState, Screen } from '@/components/ui';
import { colors } from '@/theme';

export default function Pending() {
  return (
    <Screen background={colors.canvas} footer={<Button label="Kembali ke awal" onPress={() => router.replace('/')} />}>
      <ResultState title="Pendaftaran terkirim" tone="saved" icon="hourglass">
        <Text style={{ fontSize: 17, lineHeight: 25, color: colors.text, textAlign: 'center' }}>Perangkat desa akan memeriksa data Anda. Biasanya selesai dalam 1–2 hari kerja.</Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center', marginTop: 12 }}>Setelah disetujui, Anda bisa masuk dengan username dan password yang tadi dibuat. Bila lama, hubungi kantor desa.</Text>
      </ResultState>
    </Screen>
  );
}
