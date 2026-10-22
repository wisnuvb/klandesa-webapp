import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Card, Empty, SectionTitle } from '@/components/cards';
import { Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { timeAgoId } from '@/lib/format';
import { useModQueue, type ModItem } from '@/lib/queries';
import { colors, spacing } from '@/theme';

const REASON: Record<string, string> = { hoaks: 'Hoaks', sara: 'SARA', kasar: 'Kasar', penipuan: 'Penipuan', pribadi: 'Data pribadi', lainnya: 'Lainnya' };

function Item({ it, onDone }: { it: ModItem; onDone: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const base = it.kind === 'post' ? `/staff/social/posts/${it.id}/decision` : `/staff/social/comments/${it.id}/decision`;

  async function decide(decision: string) {
    setBusy(decision);
    setError(null);
    try { await post(base, { decision, note: note.trim() }); onDone(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Gagal memproses.'); setBusy(null); }
  }
  async function sanction(action: 'mute' | 'ban') {
    try { await post('/staff/social/accounts', { accountId: it.authorId, action, days: 7 }); Alert.alert(action === 'mute' ? 'Akun dibisukan 7 hari' : 'Akun diblokir dari Warga'); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Gagal memproses.'); }
  }

  return (
    <Card>
      <Text style={{ fontSize: 13, fontWeight: '700', color: it.status === 'HIDDEN' ? colors.danger : '#B26A00' }}>
        {it.kind === 'comment' ? 'KOMENTAR' : 'POSTINGAN'} · {it.status === 'PENDING' ? 'MENUNGGU PERSETUJUAN' : it.status === 'HIDDEN' ? 'DISEMBUNYIKAN' : 'DILAPORKAN'}
      </Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{it.author}{it.authorRt ? ` · RT ${it.authorRt}` : ''}</Text>
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{timeAgoId(it.createdAt)}</Text>
      {it.content ? <Text style={{ fontSize: 16, lineHeight: 23, color: colors.text, marginTop: 6 }}>{it.content}</Text> : null}
      {it.photos.length ? (
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {it.photos.map((u) => <Image key={u} source={{ uri: u }} style={{ width: 90, height: 90, borderRadius: 8 }} contentFit="cover" />)}
        </View>
      ) : null}
      {it.youtubeThumb ? <Image source={{ uri: it.youtubeThumb }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 8, marginTop: 8 }} contentFit="cover" /> : null}
      {it.reports > 0 ? <Text style={{ fontSize: 14, fontWeight: '700', color: colors.danger, marginTop: 8 }}>{it.reports} laporan: {[...new Set(it.reasons)].map((r) => REASON[r] ?? r).join(', ')}</Text> : null}
      <ErrorBanner message={error} />

      {removing ? (
        <View style={{ marginTop: spacing.sm }}>
          <Field label="Alasan (dibaca penulis)" value={note} onChangeText={setNote} multiline maxLength={300} />
          <Button label="Hapus konten" loading={busy === 'remove'} disabled={note.trim().length < 3 || busy !== null} onPress={() => void decide('remove')} />
          <Button label="Batal" variant="link" onPress={() => setRemoving(false)} />
        </View>
      ) : (
        <View style={{ marginTop: spacing.sm, gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {it.status === 'PENDING' ? <View style={{ flex: 1 }}><Button label="Setujui" loading={busy === 'approve'} disabled={busy !== null} onPress={() => void decide('approve')} /></View> : null}
            {it.status !== 'PENDING' ? <View style={{ flex: 1 }}><Button label="Tampilkan lagi" loading={busy === 'restore'} disabled={busy !== null} onPress={() => void decide('restore')} /></View> : null}
            <View style={{ flex: 1 }}><Button label="Hapus" variant="secondary" disabled={busy !== null} onPress={() => setRemoving(true)} /></View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button label="Bisukan 7 hari" variant="link" onPress={() => Alert.alert('Bisukan akun?', `${it.author} tidak bisa memposting/berkomentar 7 hari.`, [{ text: 'Batal', style: 'cancel' }, { text: 'Bisukan', onPress: () => void sanction('mute') }])} /></View>
            <View style={{ flex: 1 }}><Button label="Blokir dari Warga" variant="link" onPress={() => Alert.alert('Blokir akun?', `${it.author} tidak bisa memakai fitur Warga.`, [{ text: 'Batal', style: 'cancel' }, { text: 'Blokir', style: 'destructive', onPress: () => void sanction('ban') }])} /></View>
          </View>
        </View>
      )}
    </Card>
  );
}

export default function Moderasi() {
  const q = useModQueue();
  const qc = useQueryClient();
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['mod-queue'] }); void qc.invalidateQueries({ queryKey: ['staff-summary'] }); };
  const d = q.data;
  return (
    <Screen onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {q.isError ? <ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Gagal memuat antrean moderasi.'} /> : null}
      {d?.mode === 'off' ? <ErrorBanner message="Fitur Warga sedang nonaktif untuk desa ini. Aktifkan di Saya → Pengaturan Warga." /> : null}
      {d ? (
        <>
          <SectionTitle>{`MENUNGGU PERSETUJUAN (${d.pending.length})`}</SectionTitle>
          {d.pending.length === 0 ? <Empty title="Tidak ada yang menunggu" /> : d.pending.map((it) => <Item key={`p${it.id}`} it={it} onDone={refresh} />)}
          <SectionTitle>{`DILAPORKAN / DISEMBUNYIKAN (${d.flagged.length})`}</SectionTitle>
          {d.flagged.length === 0 ? <Empty title="Tidak ada konten dilaporkan" /> : d.flagged.map((it) => <Item key={`${it.kind}${it.id}`} it={it} onDone={refresh} />)}
        </>
      ) : null}
    </Screen>
  );
}
