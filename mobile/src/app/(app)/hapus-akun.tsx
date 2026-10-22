import { useState } from 'react';
import { Alert } from 'react-native';

import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { deleteAccount } from '@/lib/queries';
import { useSession } from '@/state/session';

export default function HapusAkun() {
  const { signOut } = useSession();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!password) return setError('Masukkan password Anda untuk melanjutkan.');
    Alert.alert('Hapus akun?', 'Akun Anda akan dihapus permanen dan tidak bisa dikembalikan.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus akun', style: 'destructive', onPress: () => void run() },
    ]);
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      await signOut();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menghapus akun. Coba lagi.');
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button label="Hapus akun saya" loading={busy} onPress={confirm} />}>
      <Title>Hapus akun</Title>
      <Body>Yang akan dihapus: akun dan username Anda, perangkat yang terhubung, serta semua notifikasi.</Body>
      <Body muted>
        Yang tetap tersimpan di desa: data kependudukan dan arsip surat yang pernah diajukan, karena itu catatan administrasi desa. Laporan Anda
        tetap ada tetapi tanpa nama dan NIK Anda. Anda bisa mendaftar lagi kapan saja.
      </Body>
      <ErrorBanner message={error} />
      <Field label="Password" value={password} onChangeText={setPassword} secret autoComplete="current-password" hint="Untuk memastikan ini benar-benar Anda." />
    </Screen>
  );
}
