import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ActivityIndicator, Share, Text, View } from 'react-native';

import { Chip } from '@/components/cards';
import { Button, ErrorBanner, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useAnnouncement } from '@/lib/queries';
import { buildAnnouncementShare } from '@/lib/share';
import { useSession } from '@/state/session';
import { colors, spacing } from '@/theme';

export default function Kabar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useAnnouncement(Number(id));
  const village = useSession().profile?.village.name ?? '';

  if (q.isLoading) return <Screen><ActivityIndicator color={colors.primary} /></Screen>;
  if (q.isError || !q.data) {
    return (
      <Screen>
        <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat kabar.'} />
        <Button label="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </Screen>
    );
  }
  const a = q.data;
  return (
    <Screen background={colors.bg} footer={<Button label="Bagikan ke WhatsApp" icon="share-social-outline" onPress={() => void Share.share({ message: buildAnnouncementShare(a, village) })} />}>
      {a.imageUrl ? <Image source={{ uri: a.imageUrl }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 18, marginBottom: spacing.md, backgroundColor: colors.surface }} contentFit="cover" accessibilityLabel="Gambar kabar" /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Chip label={a.category.toUpperCase()} tone="green" />
        <Text style={{ fontSize: 14, color: colors.textMuted }}>{formatDateId(a.publishedAt)}</Text>
      </View>
      <Text style={{ fontSize: 28, lineHeight: 35, fontWeight: '800', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.md }} accessibilityRole="header">{a.title}</Text>
      <View style={{ height: 3, width: 40, borderRadius: 2, backgroundColor: colors.gold, marginBottom: spacing.md }} />
      <Text style={{ fontSize: 18, lineHeight: 29, color: colors.text }} selectable>{a.content}</Text>
    </Screen>
  );
}
