import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/text';

import { Chip, InfoBox } from '@/components/cards';
import { Screen, StepProgress } from '@/components/ui';
import { colors, shadow, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Pilihan cara mendaftar: ikon, judul, dan satu kalimat penjelasan. */
function Option({ icon, title, caption, badge, onPress }: { icon: IconName; title: string; caption: string; badge?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${caption}`}
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, ...shadow.card }, pressed && { opacity: 0.88 }]}
    >
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        {badge ? <Chip label={badge} tone="gold" /> : null}
        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{title}</Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: colors.textMuted }}>{caption}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

export default function ChooseMethod() {
  const p = useLocalSearchParams<{ villageId: string; name: string; mode: string }>();
  const closed = p.mode === 'closed';

  const go = (m: 'code' | 'identity') =>
    router.push({ pathname: '/daftar/form', params: { villageId: p.villageId, name: p.name, mode: p.mode, m } });

  return (
    <Screen background={colors.canvas}>
      <StepProgress pos={2} total={3} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>DESA {String(p.name ?? '').toUpperCase()}</Text>
      <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: spacing.md }} accessibilityRole="header">
        {closed ? 'Pendaftaran belum dibuka' : 'Bagaimana Anda ingin mendaftar?'}
      </Text>
      {closed ? (
        <InfoBox tone="warn">Pendaftaran mandiri belum dibuka di desa ini. Silakan datang ke kantor desa untuk mendapat kode pendaftaran.</InfoBox>
      ) : (
        <View style={{ gap: spacing.md }}>
          <Option icon="key-outline" badge="Tercepat" title="Saya punya kode dari desa" caption="Kode ada di lembar yang dibagikan perangkat desa atau RT." onPress={() => go('code')} />
          <Option
            icon="id-card-outline"
            title="Daftar dengan data diri"
            caption={`Butuh NIK, tanggal lahir, dan nama ibu kandung.${p.mode === 'approval' ? ' Akan diperiksa dulu oleh perangkat desa.' : ''}`}
            onPress={() => go('identity')}
          />
        </View>
      )}
    </Screen>
  );
}
