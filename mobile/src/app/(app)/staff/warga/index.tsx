import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { Card, Empty } from '@/components/cards';
import { Body, ErrorBanner, Field, Screen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useResidentSearch } from '@/lib/queries';
import { colors } from '@/theme';

export default function CariWarga() {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);

  const res = useResidentSearch(q);
  return (
    <Screen>
      <Field label="Cari warga" value={text} onChangeText={setText} placeholder="Nama, atau NIK/KK 16 angka" autoCapitalize="words" autoFocus />
      {q.length > 0 && q.length < 3 && !/^\d+$/.test(q) ? <Body muted>Ketik minimal 3 huruf.</Body> : null}
      {res.isFetching ? <ActivityIndicator color={colors.primary} /> : null}
      {res.isError ? <ErrorBanner message={res.error instanceof ApiError ? res.error.message : 'Pencarian gagal.'} /> : null}
      {res.isSuccess && res.data.items.length === 0 ? <Empty title="Warga tidak ditemukan" hint="Periksa ejaan, atau coba NIK/KK lengkap." /> : null}
      {res.data?.items.map((r) => (
        <Card key={r.id} onPress={() => router.push(`/staff/warga/${r.id}`)} label={`${r.name}, ${r.relation}`}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{r.name}{r.alive ? '' : ' (meninggal)'}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>{r.gender} · {r.age} tahun · {r.relation}</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted }}>NIK {r.nikMasked}{r.rt ? ` · RT ${r.rt}` : ''}{r.rw ? `/RW ${r.rw}` : ''}{r.hasApp ? ' · pakai aplikasi' : ''}</Text>
        </Card>
      ))}
    </Screen>
  );
}
