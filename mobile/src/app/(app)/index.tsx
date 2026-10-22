import { Body, Button, Screen, Title } from '@/components/ui';
import { useSession } from '@/state/session';

/** Beranda sementara (Fase 1 slice berikutnya: Urusan Saya, Kabar Desa, tab Layanan/Warga/Saya). */
export default function Home() {
  const { profile, signOut } = useSession();
  return (
    <Screen footer={<Button label="Keluar" variant="secondary" onPress={signOut} />}>
      <Body muted>{profile?.village.name}</Body>
      <Title>Halo, {profile?.account.name?.split(' ')[0] ?? 'Warga'}</Title>
      <Body>Anda berhasil masuk. Fitur Surat, Lapor, dan Kabar Desa menyusul pada tahap berikutnya.</Body>
    </Screen>
  );
}
