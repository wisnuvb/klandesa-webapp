import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError, post, type Tokens } from '@/lib/api';
import { dateInputToIso, digitsOnly, formatCodeInput, formatDateInput } from '@/lib/form';
import { useSession, type Profile } from '@/state/session';

type Errors = Partial<Record<'code' | 'nik' | 'birth' | 'mother' | 'username' | 'password', string>>;

export default function RegisterForm() {
  const p = useLocalSearchParams<{ villageId: string; name: string; m: 'code' | 'identity' }>();
  const { signIn } = useSession();
  const byCode = p.m === 'code';

  const [code, setCode] = useState('');
  const [nik, setNik] = useState('');
  const [birth, setBirth] = useState('');
  const [mother, setMother] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): { ok: true; birthIso: string | null } | { ok: false } {
    const e: Errors = {};
    if (byCode && code.replace('-', '').length !== 8) e.code = 'Kode terdiri dari 8 huruf/angka.';
    if (nik.length !== 16) e.nik = 'NIK harus 16 angka.';
    const birthIso = byCode ? null : dateInputToIso(birth);
    if (!byCode && !birthIso) e.birth = 'Isi tanggal lahir lengkap, mis. 28/02/1990.';
    if (!byCode && mother.trim().length < 2) e.mother = 'Isi nama ibu kandung.';
    if (!/^[a-z0-9._]{4,30}$/i.test(username.trim())) e.username = 'Username 4–30 karakter: huruf, angka, titik, atau garis bawah.';
    if (password.length < 8) e.password = 'Password minimal 8 karakter.';
    setErrors(e);
    return Object.keys(e).length ? { ok: false } : { ok: true, birthIso };
  }

  async function submit() {
    const v = validate();
    if (!v.ok) return;
    setBusy(true);
    setBanner(null);
    try {
      const common = { nik, username: username.trim(), password };
      const body = byCode
        ? { ...common, code }
        : { ...common, villageId: Number(p.villageId), birthDate: v.birthIso, motherName: mother.trim() };
      const res = await post<(Tokens & Profile & { status: 'ACTIVE' }) | { status: 'PENDING_VERIFY' }>(
        byCode ? '/auth/register/code' : '/auth/register/identity', body, false,
      );
      if (res.status === 'PENDING_VERIFY') return router.replace('/daftar/menunggu');
      await signIn(res);
    } catch (e) {
      if (e instanceof ApiError) {
        const field = e.extra.field;
        if (field === 'username' || field === 'password') setErrors({ [field]: e.message });
        else setBanner(e.message);
      } else {
        setBanner('Terjadi kesalahan. Coba lagi.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button label="Daftar" onPress={submit} loading={busy} />}>
      <Title>{byCode ? 'Masukkan kode' : 'Data diri Anda'}</Title>
      <Body muted>Desa {p.name}. Data hanya dicocokkan dengan data desa Anda.</Body>
      <ErrorBanner message={banner} />
      {byCode ? (
        <Field label="Kode dari desa" value={code} onChangeText={(t) => setCode(formatCodeInput(t))} autoCapitalize="characters" placeholder="XXXX-XXXX" error={errors.code} />
      ) : null}
      <Field label="NIK (16 angka)" value={nik} onChangeText={(t) => setNik(digitsOnly(t, 16))} keyboardType="number-pad" maxLength={16} error={errors.nik} />
      {!byCode ? (
        <>
          <Field label="Tanggal lahir" value={birth} onChangeText={(t) => setBirth(formatDateInput(t))} keyboardType="number-pad" placeholder="HH/BB/TTTT" hint="Contoh: 28/02/1990" error={errors.birth} />
          <Field label="Nama ibu kandung" value={mother} onChangeText={setMother} autoCapitalize="words" error={errors.mother} />
        </>
      ) : null}
      <Title>Buat akun</Title>
      <Field label="Username" value={username} onChangeText={setUsername} autoComplete="username-new" hint="Dipakai untuk masuk. Contoh: siti.aminah" error={errors.username} />
      <Field label="Password" value={password} onChangeText={setPassword} secret autoComplete="password-new" hint="Minimal 8 karakter. Jangan pakai NIK atau tanggal lahir." error={errors.password} />
    </Screen>
  );
}
