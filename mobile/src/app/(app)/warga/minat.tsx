import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Alert, Switch, View } from 'react-native';
import { Text } from '@/components/text';

import { EmptyState, InfoBox, SectionHeader } from '@/components/cards';
import { Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError, api } from '@/lib/api';
import { useSocialInterests, type InterestItem } from '@/lib/queries';
import { colors, shadow, spacing } from '@/theme';

const KIND_ICON: Record<InterestItem['kind'], keyof typeof Ionicons.glyphMap> = {
  category: 'albums-outline', author: 'person-outline', tag: 'pricetag-outline', rt: 'home-outline', format: 'image-outline',
};
const STRENGTH_WORD = { 1: 'sedikit', 2: 'cukup', 3: 'sering' } as const;

/** Satu minat: ikon, nama, dan tiga titik kekuatan. Kekuatan juga ditulis, tidak hanya titik. */
function Row({ it }: { it: InterestItem }) {
  return (
    <View accessible accessibilityLabel={`${it.label}, ${STRENGTH_WORD[it.strength]}`} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 60, ...shadow.card }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={KIND_ICON[it.kind]} size={22} color={colors.primary} />
      </View>
      <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.text }}>{it.label}</Text>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[1, 2, 3].map((n) => <View key={n} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: n <= it.strength ? colors.gold : colors.border }} />)}
        </View>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>{STRENGTH_WORD[it.strength]}</Text>
      </View>
    </View>
  );
}

export default function MinatSaya() {
  const q = useSocialInterests();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['social-interests'] });
    await qc.invalidateQueries({ queryKey: ['social-config'] });
    await qc.invalidateQueries({ queryKey: ['social-feed'] });
  };
  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); await refresh(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Gagal menyimpan. Coba lagi.'); }
    finally { setBusy(false); }
  }
  const toggle = (learn: boolean) => run(() => api('/social/interests', { method: 'PATCH', body: JSON.stringify({ learn }) }));
  const reset = () => Alert.alert('Atur ulang minat?', 'Semua yang sudah dipelajari dihapus, dan postingan yang pernah Anda kurangi bisa tampil lagi.', [
    { text: 'Batal', style: 'cancel' },
    { text: 'Atur ulang', style: 'destructive', onPress: () => void run(() => api('/social/interests', { method: 'DELETE' })) },
  ]);

  const learning = q.data?.learning ?? true;
  return (
    <Screen background={colors.canvas}>
      <InfoBox>
        Tab “Untuk Anda” memilihkan postingan dari yang pernah Anda sukai, buka, simpan, dan bagikan. Data ini hanya dipakai di Warga desa Anda, tidak dijual, dan Anda yang mengaturnya.
      </InfoBox>
      <ErrorBanner message={error} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bg, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.md, minHeight: 72, ...shadow.card }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Pelajari minat saya</Text>
          <Text style={{ fontSize: 14, lineHeight: 19, color: colors.textMuted, marginTop: 2 }}>
            {learning ? 'Aktif. Matikan bila Anda tidak ingin dipelajari; minat yang sudah ada ikut dihapus.' : 'Mati. Tidak ada yang dicatat. Tab Terbaru tetap menampilkan semuanya.'}
          </Text>
        </View>
        <Switch value={learning} disabled={busy || q.isLoading} onValueChange={(v) => void toggle(v)} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#FFFFFF" accessibilityLabel="Pelajari minat saya" />
      </View>

      <SectionHeader>Yang saya tangkap sejauh ini</SectionHeader>
      {q.isLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat.'} /> : null}
      {q.isSuccess && !learning ? <EmptyState icon="shield-checkmark-outline" title="Tidak ada yang dipelajari" hint="Anda memilih tidak dipelajari. Hidupkan lagi kapan saja." /> : null}
      {q.isSuccess && learning && q.data.items.length === 0 ? <EmptyState icon="sparkles-outline" title="Belum ada yang ditangkap" hint="Suka, buka, atau bagikan beberapa postingan dan minat Anda akan muncul di sini." /> : null}
      <View style={{ gap: spacing.sm }}>{q.data?.items.map((it) => <Row key={`${it.kind}:${it.label}`} it={it} />)}</View>

      {learning ? (
        <View style={{ marginTop: spacing.lg }}>
          <Button label="Atur ulang minat saya" variant="secondary" icon="refresh" loading={busy} onPress={reset} />
        </View>
      ) : null}
      <Text style={{ fontSize: 14, lineHeight: 20, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md }}>Minat meluruh sendiri dari waktu ke waktu. Tab Terbaru selalu menampilkan semua postingan urut waktu.</Text>
    </Screen>
  );
}
