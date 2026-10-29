import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text } from '@/components/text';

import { Chip, EmptyState, InfoBox, type Tone } from '@/components/cards';
import { ErrorBanner, Field, Screen, StepProgress } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { colors, shadow, spacing, TOUCH_MIN } from '@/theme';

type VillageHit = { id: number; name: string; district: string; regency: string; signupMode: 'auto' | 'approval' | 'closed' };

const MODE = {
  auto: { label: 'Langsung aktif', tone: 'green' },
  approval: { label: 'Perlu persetujuan desa', tone: 'gold' },
  closed: { label: 'Belum dibuka', tone: 'red' },
} as const satisfies Record<string, { label: string; tone: Tone }>;

export default function PickVillage() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<VillageHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        const r = await api<{ items: VillageHit[] }>(`/villages/search?q=${encodeURIComponent(term)}`, { auth: false, signal: ctrl.signal });
        setItems(r.items);
      } catch (e) {
        if (!ctrl.signal.aborted) setError(e instanceof ApiError ? e.message : 'Gagal mencari desa.');
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const term = q.trim();
  return (
    <Screen background={colors.canvas}>
      <StepProgress pos={1} total={3} />
      <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 }} accessibilityRole="header">Di desa mana Anda tinggal?</Text>
      <Text style={{ fontSize: 16, lineHeight: 23, color: colors.textMuted, marginBottom: spacing.md }}>Ketik nama desa atau kecamatan Anda, minimal 3 huruf.</Text>
      <Field label="Nama desa" icon="search-outline" value={q} onChangeText={setQ} placeholder="contoh: Sukamaju" autoCapitalize="words" returnKeyType="search" />
      <ErrorBanner message={error} />
      {busy ? <ActivityIndicator color={colors.primary} /> : null}
      {!busy && term.length >= 3 && items.length === 0 && !error ? (
        <EmptyState icon="help-circle-outline" title="Desa tidak ditemukan" hint="Pastikan desa Anda sudah memakai Klandesa, atau tanyakan ke kantor desa." />
      ) : null}
      {term.length < 3 ? <InfoBox>Belum menemukan desa Anda? Desa harus sudah terdaftar di Klandesa. Tanyakan ke kantor desa.</InfoBox> : null}
      <View style={{ gap: spacing.sm }}>
        {items.map((v) => (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            accessibilityLabel={`Desa ${v.name}, Kecamatan ${v.district}, ${v.regency}. ${MODE[v.signupMode].label}`}
            onPress={() => router.push({ pathname: '/daftar/metode', params: { villageId: String(v.id), name: v.name, mode: v.signupMode } })}
            style={({ pressed }) => [{ minHeight: TOUCH_MIN + 16, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 18, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, ...shadow.card }, pressed && { opacity: 0.88 }]}
          >
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="home" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{v.name}</Text>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>Kec. {v.district}, {v.regency}</Text>
              <Chip label={MODE[v.signupMode].label} tone={MODE[v.signupMode].tone} />
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
