import { router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, post, type Tokens } from '@/lib/api';
import { useSession, type Profile } from '@/state/session';

export default function Login() {
  const { signIn } = useSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!identifier.trim() || !password) return setError('Isi username dan password.');
    setBusy(true);
    setError(null);
    try {
      const r = await post<Tokens & Profile>('/auth/login', { identifier: identifier.trim(), password }, false);
      await signIn(r); // pengalihan ke beranda dilakukan oleh Stack.Protected
    } catch (e) {
      if (e instanceof ApiError && e.extra.reason === 'PENDING_VERIFY') {
        router.replace('/daftar/menunggu');
      } else {
        setError(e instanceof ApiError ? e.message : 'Terjadi kesalahan. Coba lagi.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      footer={<Button label="Masuk" onPress={submit} loading={busy} />}
    >
      <Body muted>Masuk dengan username dan password yang Anda buat saat mendaftar. Perangkat desa memakai email.</Body>
      <ErrorBanner message={error} />
      <Field label="Username" value={identifier} onChangeText={setIdentifier} autoComplete="username" textContentType="username" returnKeyType="next" />
      <Field label="Password" value={password} onChangeText={setPassword} secret autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
      <Button label="Lupa password?" variant="link" onPress={() => router.push('/lupa-password')} />
      <Button label="Belum punya akun? Daftar" variant="link" onPress={() => router.push('/daftar')} />
    </Screen>
  );
}
