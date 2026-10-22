import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Body, Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { colors, spacing } from '@/theme';

const CATEGORIES = ['Pengumuman', 'Berita', 'Event'] as const;

export default function NewAnnouncement() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Pengumuman');
  const [pinned, setPinned] = useState(false);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = title.trim().length >= 3 && content.trim().length >= 3;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await post<{ id: number; notified: boolean; note: string | null }>('/staff/announcements', { title: title.trim(), content: content.trim(), category, pinned, notify });
      void qc.invalidateQueries({ queryKey: ['staff-announcements'] });
      Alert.alert(r.notified ? 'Terbit & dikirim ke warga' : 'Pengumuman terbit', r.note ?? (r.notified ? 'Warga yang memakai aplikasi akan menerima notifikasi.' : 'Pengumuman tampil di Kabar Desa.'), [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menerbitkan. Coba lagi.');
      setBusy(false);
    }
  }

  function confirm() {
    Alert.alert('Terbitkan pengumuman?', notify ? 'Semua warga desa akan menerima notifikasi.' : 'Pengumuman tampil di Kabar Desa tanpa notifikasi.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Terbitkan', onPress: () => void send() },
    ]);
  }

  return (
    <Screen footer={<Button label="Terbitkan" disabled={!valid} loading={busy} onPress={confirm} />}>
      <ErrorBanner message={error} />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
        {CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => setCategory(c)} accessibilityRole="button" accessibilityState={{ selected: category === c }}
            style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center', borderWidth: 1.5, borderColor: category === c ? colors.primary : colors.border, backgroundColor: category === c ? '#E3F3EA' : colors.bg }}>
            <Text style={{ fontSize: 16, color: colors.text, fontWeight: '600' }}>{c}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Judul" value={title} onChangeText={setTitle} autoCapitalize="sentences" maxLength={200} />
      <Field label="Isi pengumuman" value={content} onChangeText={setContent} autoCapitalize="sentences" multiline maxLength={5000} hint="Tulis jelas dan singkat: apa, kapan, di mana." />
      <Row label="Sematkan di atas" hint="Tampil sebagai kabar penting." value={pinned} onChange={setPinned} />
      <Row label="Kirim notifikasi ke warga" hint="Maksimal 3 kali per hari. Pakai untuk kabar yang benar-benar penting." value={notify} onChange={setNotify} />
      <Body muted>Pengumuman tampil di Kabar Desa pada aplikasi warga.</Body>
    </Screen>
  );
}

function Row({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: colors.primary }} />
    </View>
  );
}
