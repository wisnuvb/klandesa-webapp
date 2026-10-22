import { router } from 'expo-router';

import { Body, Button, Screen, Title } from '@/components/ui';

export default function Pending() {
  return (
    <Screen footer={<Button label="Kembali ke awal" onPress={() => router.replace('/')} />}>
      <Title>Pendaftaran terkirim</Title>
      <Body>Perangkat desa akan memeriksa data Anda. Biasanya selesai dalam 1–2 hari kerja.</Body>
      <Body muted>Setelah disetujui, Anda bisa masuk dengan username dan password yang tadi dibuat. Bila lama, hubungi kantor desa.</Body>
    </Screen>
  );
}
