import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { useSocialSettings } from '@/lib/queries';
import { colors } from '@/theme';

const MODES: ['off' | 'post' | 'pre', string, string][] = [
  ['off', 'Nonaktif', 'Fitur Warga tidak tampil bagi warga.'],
  ['post', 'Pasca-moderasi', 'Postingan langsung tampil. Warga melapor, perangkat desa meninjau. Cocok bila admin tidak selalu aktif.'],
  ['pre', 'Pra-moderasi', 'Postingan tampil setelah disetujui perangkat desa. Paling aman, tetapi butuh admin yang aktif.'],
];

export default function PengaturanWarga() {
  const q = useSocialSettings();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'off' | 'post' | 'pre'>('off');
  const [words, setWords] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data) { setMode(q.data.mode); setWords(q.data.bannedWords.join(', ')); }
  }, [q.data]);

  async function save() {
    setBusy(true); setError(null); setSaved(false);
    try {
      await api('/staff/social/settings', { method: 'PATCH', body: JSON.stringify({ mode, bannedWords: words.split(/[,\n]/).map((w) => w.trim()).filter(Boolean) }) });
      await qc.invalidateQueries({ queryKey: ['mod-settings'] });
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menyimpan.');
    } finally { setBusy(false); }
  }

  if (q.isLoading) return <Screen><ActivityIndicator color={colors.primary} /></Screen>;
  return (
    <Screen footer={<Button label="Simpan" loading={busy} onPress={save} />}>
      <Title>Pengaturan Warga</Title>
      <Body muted>Atur apakah warga desa boleh saling berbagi foto dan tulisan, dan seberapa ketat pengawasannya.</Body>
      <ErrorBanner message={error} />
      {saved ? <Body>Tersimpan ✓</Body> : null}
      {MODES.map(([k, label, hint]) => (
        <Pressable key={k} onPress={() => setMode(k)} accessibilityRole="radio" accessibilityState={{ selected: mode === k }}
          style={{ borderRadius: 14, borderWidth: 2, borderColor: mode === k ? colors.primary : colors.border, backgroundColor: mode === k ? '#E3F3EA' : colors.bg, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{label}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{hint}</Text>
        </Pressable>
      ))}
      <Field label="Kata terlarang tambahan (pisahkan dengan koma)" value={words} onChangeText={setWords} multiline hint="Selain daftar bawaan (judi, pinjol, dsb). Minimal 3 huruf per kata." />
    </Screen>
  );
}
