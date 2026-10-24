import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ActivityIndicator, Share, Text } from 'react-native';

import { Body, Button, ErrorBanner, Screen, Title } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId } from '@/lib/format';
import { useAnnouncement } from '@/lib/queries';
import { buildAnnouncementShare } from '@/lib/share';
import { useSession } from '@/state/session';
import { colors } from '@/theme';

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
    <Screen footer={<Button label="Bagikan ke WhatsApp" icon="share-social-outline" onPress={() => void Share.share({ message: buildAnnouncementShare(a, village) })} />}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{a.category.toUpperCase()}</Text>
      <Title>{a.title}</Title>
      <Body muted>{formatDateId(a.publishedAt)}</Body>
      {a.imageUrl ? <Image source={{ uri: a.imageUrl }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 16 }} contentFit="cover" accessibilityLabel="Gambar kabar" /> : null}
      <Text style={{ fontSize: 17, lineHeight: 26, color: colors.text }} selectable>{a.content}</Text>
    </Screen>
  );
}
