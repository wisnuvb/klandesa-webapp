import { router } from 'expo-router';
import { useState } from 'react';

import { Text } from 'react-native';

import { StepTitle } from '@/components/cards';
import { Button, ErrorBanner, Field, Hero, ResultState, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { dateInputToIso, digitsOnly, formatCodeInput, formatDateInput } from '@/lib/form';
import { colors } from '@/theme';

export default function ForgotPassword() {
  const [mode, setMode] = useState<'code' | 'identity'>('code');
  const [villageId, setVillageId] = useState('');
  const [nik, setNik] = useState('');
  const [code, setCode] = useState('');
  const [birth, setBirth] = useState('');
  const [mother, setMother] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (nik.length !== 16) return setError('NIK harus 16 angka.');
    if (pw.length < 8) return setError('Password baru minimal 8 karakter.');
    const birthIso = mode === 'identity' ? dateInputToIso(birth) : null;
    if (mode === 'identity' && !birthIso) return setError('Isi tanggal lahir lengkap.');
    setBusy(true);
    try {
      await post('/auth/password/reset', {
        mode, nik, newPassword: pw,
        ...(mode === 'code' ? { code } : { villageId: Number(villageId), birthDate: birthIso, motherName: mother }),
      }, false);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Terjadi kesalahan. Coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Screen background={colors.canvas} footer={<Button label="Masuk" icon="log-in-outline" onPress={() => router.replace('/login')} />}>
        <ResultState title="Password diperbarui">
          <Text style={{ fontSize: 17, lineHeight: 25, color: colors.text, textAlign: 'center' }}>Silakan masuk dengan password baru Anda. Semua perangkat lama otomatis keluar.</Text>
        </ResultState>
      </Screen>
    );
  }

  return (
    <Screen background={colors.canvas} footer={<Button label="Simpan password baru" icon="checkmark" onPress={submit} loading={busy} />}>
      <Hero icon="key-outline" title="Atur ulang password" subtitle={mode === 'code' ? 'Minta kode reset ke kantor desa atau ketua RT, lalu isi di sini.' : 'Isi data diri Anda seperti saat mendaftar.'} />
      <ErrorBanner message={error} />
      <StepTitle n={1}>Data Anda</StepTitle>
      <Field label="NIK (16 angka)" icon="card-outline" placeholder="16 angka sesuai KTP" value={nik} onChangeText={(t) => setNik(digitsOnly(t, 16))} keyboardType="number-pad" maxLength={16} />
      {mode === 'code' ? (
        <Field label="Kode reset" icon="key-outline" value={code} onChangeText={(t) => setCode(formatCodeInput(t))} autoCapitalize="characters" placeholder="XXXX-XXXX" />
      ) : (
        <>
          <Field label="ID desa" icon="home-outline" placeholder="Angka dari kantor desa" value={villageId} onChangeText={(t) => setVillageId(digitsOnly(t, 9))} keyboardType="number-pad" hint="Tanyakan ke kantor desa bila tidak tahu." />
          <Field label="Tanggal lahir" icon="calendar-outline" value={birth} onChangeText={(t) => setBirth(formatDateInput(t))} keyboardType="number-pad" placeholder="HH/BB/TTTT" />
          <Field label="Nama ibu kandung" icon="person-outline" placeholder="Sesuai Kartu Keluarga" value={mother} onChangeText={setMother} autoCapitalize="words" />
        </>
      )}
      <StepTitle n={2}>Password baru</StepTitle>
      <Field label="Password baru" icon="lock-closed-outline" placeholder="Minimal 8 karakter" value={pw} onChangeText={setPw} secret autoComplete="password-new" hint="Minimal 8 karakter." />
      <Button
        label={mode === 'code' ? 'Tidak punya kode? Pakai data diri' : 'Punya kode reset? Pakai kode'}
        variant="link"
        onPress={() => setMode(mode === 'code' ? 'identity' : 'code')}
      />
    </Screen>
  );
}
