import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { InfoBox } from '@/components/cards';
import { Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { deleteAccount } from '@/lib/queries';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

/** Daftar singkat dengan ikon: apa yang terhapus dan apa yang tetap tersimpan. */
function Points({ title, icon, color, bg, items }: { title: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; items: string[] }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 18, padding: spacing.md, gap: spacing.sm }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color }} accessibilityRole="header">{title}</Text>
      {items.map((t) => (
        <View key={t} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
          <Ionicons name={icon} size={20} color={color} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 16, lineHeight: 22, color: colors.text }}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export default function HapusAkun() {
  const { signOut } = useSession();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!password) return setError('Masukkan password Anda untuk melanjutkan.');
    Alert.alert('Hapus akun?', 'Akun Anda akan dihapus permanen dan tidak bisa dikembalikan.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus akun', style: 'destructive', onPress: () => void run() },
    ]);
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      await signOut();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal menghapus akun. Coba lagi.');
      setBusy(false);
    }
  }

  return (
    <Screen background={colors.canvas} footer={<Button label="Hapus akun saya" icon="trash-outline" loading={busy} onPress={confirm} style={{ backgroundColor: colors.danger }} />}>
      <InfoBox tone="warn">Penghapusan akun bersifat permanen dan tidak bisa dibatalkan.</InfoBox>
      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        <Points
          title="Yang akan dihapus"
          icon="close-circle"
          color={colors.danger}
          bg="#FDECEA"
          items={['Akun dan username Anda', 'Perangkat yang terhubung', 'Semua notifikasi']}
        />
        <Points
          title="Yang tetap tersimpan di desa"
          icon="checkmark-circle"
          color={colors.primary}
          bg={colors.primarySoft}
          items={['Data kependudukan dan arsip surat yang pernah diajukan, karena itu catatan administrasi desa', 'Laporan Anda tetap ada, tetapi tanpa nama dan NIK Anda']}
        />
        <Text style={{ fontSize: 15, lineHeight: 21, color: colors.textMuted }}>Anda bisa mendaftar lagi kapan saja.</Text>
      </View>
      <View style={{ marginTop: spacing.md }}>
        <ErrorBanner message={error} />
        <Field label="Password" icon="lock-closed-outline" placeholder="Masukkan password Anda" value={password} onChangeText={setPassword} secret autoComplete="current-password" hint="Untuk memastikan ini benar-benar Anda." />
      </View>
    </Screen>
  );
}
