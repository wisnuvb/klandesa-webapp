import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { Button, Field } from '@/components/ui';
import { formatRupiahFull, parseRupiahInput } from '@/lib/format';
import type { FeeStatus } from '@/lib/queries';
import { uploadReportPhoto } from '@/lib/upload';
import { colors, spacing } from '@/theme';

/** Status selalu berikon + teks (tidak mengandalkan warna saja). */
const STATUS: Record<FeeStatus, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  paid: { icon: 'checkmark-circle', color: colors.primary, bg: colors.primarySoft },
  partial: { icon: 'contrast-outline', color: '#8A5A00', bg: '#FFF3DB' },
  claimed: { icon: 'time-outline', color: '#8A5A00', bg: '#FFF3DB' },
  waived: { icon: 'remove-circle-outline', color: colors.textMuted, bg: colors.surface },
  overdue: { icon: 'alert-circle', color: colors.danger, bg: '#FDECEA' },
  unpaid: { icon: 'ellipse-outline', color: colors.text, bg: colors.surface },
};

export function StatusBadge({ status, label }: { status: FeeStatus; label: string }) {
  const s = STATUS[status];
  return (
    <View accessible accessibilityLabel={`Status: ${label}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Ionicons name={s.icon} size={18} color={s.color} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: s.color }}>{label}</Text>
    </View>
  );
}

export const METHODS: { key: 'cash' | 'transfer' | 'qris'; label: string }[] = [
  { key: 'cash', label: 'Tunai' }, { key: 'transfer', label: 'Transfer' }, { key: 'qris', label: 'QRIS' },
];

export function Chips<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T | null; onChange: (k: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={o.label}
            style={{ minHeight: 48, paddingHorizontal: 18, borderRadius: 24, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? colors.primary : colors.primarySoft }}>
            {on ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
            <Text style={{ fontSize: 16, fontWeight: '700', color: on ? '#fff' : colors.primary }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Kolom nominal: angka saja, dengan pratinjau "Rp25.000" agar tidak salah nol. */
export function AmountField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const n = parseRupiahInput(value);
  return <Field label={label} value={value} onChangeText={onChange} keyboardType="number-pad" maxLength={10} hint={n ? `${formatRupiahFull(n)}${hint ? ` · ${hint}` : ''}` : hint} />;
}

/** Foto bukti/nota: opsional, dikompres dan diunggah saat dipilih. `onUrl(null)` bila dihapus. */
export function ProofPhoto({ label = 'Foto bukti (boleh dilewati)', url, onUrl }: { label?: string; url: string | null; onUrl: (u: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(source: 'camera' | 'library') {
    setError(null);
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setError('Izin kamera ditolak. Pilih dari galeri.');
    }
    const r = source === 'camera' ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 1 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });
    if (r.canceled || !r.assets[0]) return;
    setBusy(true);
    try {
      onUrl(await uploadReportPhoto(r.assets[0].uri, 'fee'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Foto gagal diunggah. Coba lagi.');
    } finally { setBusy(false); }
  }

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 6 }}>{label}</Text>
      {url ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image source={{ uri: url }} style={{ width: 72, height: 72, borderRadius: 10 }} contentFit="cover" accessibilityLabel="Foto bukti terpasang" />
          <Button label="Hapus foto" variant="link" onPress={() => onUrl(null)} />
        </View>
      ) : busy ? <ActivityIndicator color={colors.primary} /> : (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Button label="Ambil foto" icon="camera-outline" variant="secondary" onPress={() => void pick('camera')} /></View>
          <View style={{ flex: 1 }}><Button label="Galeri" icon="image-outline" variant="secondary" onPress={() => void pick('library')} /></View>
        </View>
      )}
      {error ? <Text style={{ color: colors.danger, fontSize: 14, marginTop: 4 }} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}
