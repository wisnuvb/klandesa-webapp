import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/text';
import { useQueryClient } from '@tanstack/react-query';

import { SectionHeader } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { useFeedMetrics, useSocialSettings, type FeedMetrics } from '@/lib/queries';
import { colors } from '@/theme';

const MODES: ['off' | 'post' | 'pre', string, string][] = [
  ['off', 'Nonaktif', 'Fitur Warga tidak tampil bagi warga.'],
  ['post', 'Pasca-moderasi', 'Postingan langsung tampil. Warga melapor, perangkat desa meninjau. Cocok bila admin tidak selalu aktif.'],
  ['pre', 'Pra-moderasi', 'Postingan tampil setelah disetujui perangkat desa. Paling aman, tetapi butuh admin yang aktif.'],
];

const FEEDS: ['auto' | 'on' | 'off', string, string][] = [
  ['auto', 'Otomatis (disarankan)', '"Untuk Anda" muncul bila desa cukup ramai (sekitar 40 postingan seminggu). Selain itu urut waktu.'],
  ['on', 'Selalu aktif', '"Untuk Anda" selalu tersedia, walau desa masih sepi.'],
  ['off', 'Hanya Terbaru', 'Semua postingan urut waktu, tanpa pilihan "Untuk Anda". Cocok menjelang pilkades atau bila ingin paling sederhana.'],
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Ringkasan 14 hari: apakah warga membaca, dan apakah jangkauannya merata. Angka kecil di desa sepi wajar; baca sebagai petunjuk. */
function Metrics({ m }: { m: FeedMetrics }) {
  const line = (label: string, value: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
      <Text style={{ flex: 1, fontSize: 15, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{value}</Text>
    </View>
  );
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
      {line('Warga yang membaca', String(m.readers))}
      {line('Postingan baru', `${m.fairness.posts} dari ${m.fairness.authors} penulis`)}
      {line('Dibuka dari "Untuk Anda"', m.tabs.forYou.seen ? pct(m.tabs.forYou.openRate) : '-')}
      {line('Dibuka dari "Terbaru"', m.tabs.latest.seen ? pct(m.tabs.latest.openRate) : '-')}
      {line('Postingan yang sudah direspons', pct(m.fairness.postsWithReaction))}
      {line('Postingan belum dibaca siapa pun', pct(m.fairness.postsNeverSeen))}
      {m.notes.map((n) => <Text key={n} style={{ fontSize: 14, lineHeight: 20, color: colors.goldText, marginTop: 8 }}>{n}</Text>)}
    </View>
  );
}

export default function PengaturanWarga() {
  const q = useSocialSettings();
  const metrics = useFeedMetrics(14);
  const qc = useQueryClient();
  const [mode, setMode] = useState<'off' | 'post' | 'pre'>('off');
  const [feed, setFeed] = useState<'auto' | 'on' | 'off'>('auto');
  const [words, setWords] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (q.data) { setMode(q.data.mode); setFeed(q.data.feed ?? 'auto'); setWords(q.data.bannedWords.join(', ')); }
  }, [q.data]);

  async function save() {
    setBusy(true); setError(null); setSaved(false);
    try {
      await api('/staff/social/settings', { method: 'PATCH', body: JSON.stringify({ mode, feed, bannedWords: words.split(/[,\n]/).map((w) => w.trim()).filter(Boolean) }) });
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
      <SectionHeader>Urutan postingan</SectionHeader>
      <Body muted>Warga bisa memilih tab “Untuk Anda” (dipilihkan menurut minat) atau “Terbaru” (urut waktu). Kabar resmi desa selalu di atas.</Body>
      {FEEDS.map(([k, label, hint]) => (
        <Pressable key={k} onPress={() => setFeed(k)} accessibilityRole="radio" accessibilityState={{ selected: feed === k }}
          style={{ borderRadius: 14, borderWidth: 2, borderColor: feed === k ? colors.primary : colors.border, backgroundColor: feed === k ? '#E3F3EA' : colors.bg, padding: 14, marginBottom: 10 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{label}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{hint}</Text>
        </Pressable>
      ))}
      {metrics.data && metrics.data.readers > 0 ? (
        <>
          <SectionHeader>14 hari terakhir</SectionHeader>
          <Metrics m={metrics.data} />
        </>
      ) : null}
      <Field label="Kata terlarang tambahan (pisahkan dengan koma)" value={words} onChangeText={setWords} multiline hint="Selain daftar bawaan (judi, pinjol, dsb). Minimal 3 huruf per kata." />
    </Screen>
  );
}
