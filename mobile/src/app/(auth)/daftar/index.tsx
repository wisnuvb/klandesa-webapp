import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Body, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { colors, spacing, TOUCH_MIN } from '@/theme';

type VillageHit = { id: number; name: string; district: string; regency: string; signupMode: 'auto' | 'approval' | 'closed' };

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

  return (
    <Screen>
      <Body>Ketik nama desa atau kecamatan Anda.</Body>
      <Field label="Nama desa" value={q} onChangeText={setQ} placeholder="mis. Sukamaju" autoCapitalize="words" />
      <ErrorBanner message={error} />
      {busy ? <ActivityIndicator color={colors.primary} /> : null}
      {!busy && q.trim().length >= 3 && items.length === 0 && !error ? (
        <Body muted>Desa tidak ditemukan. Pastikan desa Anda sudah memakai Klandesa, atau tanyakan ke kantor desa.</Body>
      ) : null}
      <View style={{ gap: spacing.sm }}>
        {items.map((v) => (
          <Pressable
            key={v.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/daftar/metode', params: { villageId: String(v.id), name: v.name, mode: v.signupMode } })}
            style={{ minHeight: TOUCH_MIN, padding: spacing.md, borderRadius: 12, backgroundColor: colors.surface, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{v.name}</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted }}>Kec. {v.district}, {v.regency}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
