import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, View } from 'react-native';
import { Text } from '@/components/text';

import { Chip, InfoBox } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatDateId, formatRupiahFull } from '@/lib/format';
import { useActUkmOrder, useUkmOrder } from '@/lib/queries';
import { ACTION_TEXT, noteProblem, orderLook, type UkmOrderAction } from '@/lib/ukm-order-logic';
import { colors, spacing } from '@/theme';

export default function DetailPesanan() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = Number(raw);
  const q = useUkmOrder(id);
  const act = useActUkmOrder();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const d = q.data;

  if (q.isLoading) return <Screen><ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} /></Screen>;
  if (!d) return <Screen><ErrorBanner message={q.error instanceof ApiError ? q.error.message : 'Pesanan tidak ditemukan.'} /></Screen>;

  const { order: o, role } = d;
  const look = orderLook(o.status);

  function run(action: UkmOrderAction) {
    setError(null);
    const problem = noteProblem(action, role, note);
    if (problem) return setError(problem);
    Alert.alert(ACTION_TEXT[action].button, ACTION_TEXT[action].confirm, [
      { text: 'Kembali', style: 'cancel' },
      {
        text: ACTION_TEXT[action].button,
        style: action === 'batal' ? 'destructive' : 'default',
        onPress: () => act.mutate({ id, action, note: note.trim() || null }, { onSuccess: () => setNote(''), onError: (e) => setError(e instanceof ApiError ? e.message : 'Belum berhasil. Coba lagi.') }),
      },
    ]);
  }

  const canBatal = o.actions.includes('batal');
  const footer = o.actions.length || o.whatsappUrl ? (
    <View style={{ gap: spacing.sm }}>
      {o.whatsappUrl ? <Button label="Hubungi penjual lewat WhatsApp" icon="logo-whatsapp" onPress={() => void Linking.openURL(o.whatsappUrl as string).catch(() => Alert.alert('Tidak bisa dibuka', 'WhatsApp belum terpasang di perangkat ini.'))} /> : null}
      {o.actions.filter((a) => a !== 'batal').map((a) => <Button key={a} label={ACTION_TEXT[a].button} loading={act.isPending} onPress={() => run(a)} />)}
      {canBatal ? <Button label={ACTION_TEXT.batal.button} variant="secondary" loading={act.isPending} onPress={() => run('batal')} /> : null}
    </View>
  ) : undefined;

  return (
    <Screen footer={footer}>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }} accessibilityRole="header">{o.productName}</Text>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}><Chip label={look.label} tone={look.tone} icon={look.icon} /></View>
      <Text style={{ fontSize: 16, color: colors.text, marginTop: spacing.md }}>
        Jumlah: {o.quantity}{o.unit ? ` ${o.unit}` : ''}{o.estimatedTotal ? `. Perkiraan total ${formatRupiahFull(Number(o.estimatedTotal))}` : ''}
      </Text>
      <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4 }}>
        {role === 'PEMBELI' ? `Penjual: ${o.seller.name}${o.seller.managedByVillage ? ' (dikelola desa)' : ''}` : `Pembeli: ${o.buyer.name}${o.buyer.area ? `, ${o.buyer.area}` : ''}`}
      </Text>
      {o.buyerNote ? <Text style={{ fontSize: 15, color: colors.text, marginTop: spacing.sm }}>Catatan pembeli: {o.buyerNote}</Text> : null}
      {o.sellerNote ? <Text style={{ fontSize: 15, color: colors.text, marginTop: spacing.sm }}>Catatan penjual: {o.sellerNote}</Text> : null}

      {role === 'PEMBELI' && o.status === 'DIMINTA' && !o.whatsappUrl ? (
        <View style={{ marginTop: spacing.md }}>
          <InfoBox tone="info">Penjual tidak mencantumkan kontak. Penjual atau kantor desa akan menanggapi lewat aplikasi.</InfoBox>
        </View>
      ) : null}
      {role === 'PEMBELI' && o.status === 'DIKONFIRMASI' ? <Body muted>Untuk membatalkan pesanan yang sudah dikonfirmasi, hubungi penjual.</Body> : null}

      {canBatal ? (
        <View style={{ marginTop: spacing.md }}>
          <Field label={role === 'PENJUAL' ? 'Alasan (wajib bila membatalkan)' : 'Catatan pembatalan (boleh dikosongkan)'} value={note} onChangeText={(t) => setNote(t.slice(0, 300))} multiline hint={`${note.length}/300`} />
        </View>
      ) : null}
      <ErrorBanner message={error} />

      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs }} accessibilityRole="header">Riwayat</Text>
      {d.events.map((e, i) => (
        <View key={i} style={{ marginBottom: spacing.sm }} accessible accessibilityLabel={`${e.toLabel}, ${formatDateId(e.at)}${e.note ? `. ${e.note}` : ''}`}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{e.toLabel}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>{formatDateId(e.at)}</Text>
          {e.note ? <Text style={{ fontSize: 14, color: colors.text }}>{e.note}</Text> : null}
        </View>
      ))}
    </Screen>
  );
}
