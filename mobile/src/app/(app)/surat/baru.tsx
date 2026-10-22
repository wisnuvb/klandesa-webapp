import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card } from '@/components/cards';
import { Body, Button, ErrorBanner, Field, Screen, Title } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { registerPush } from '@/lib/push';
import { useCreateRequest, useFamily } from '@/lib/queries';
import { colors, spacing } from '@/theme';

const QUICK_PURPOSES = ['Melamar kerja', 'Bank / pinjaman', 'Sekolah / beasiswa', 'Urusan instansi', 'Lainnya'];

type Step = 'who' | 'purpose' | 'review' | 'done';

export default function NewMail() {
  const p = useLocalSearchParams<{ templateId: string; name: string; purpose?: string }>();
  const templateId = Number(p.templateId);
  const family = useFamily();
  const create = useCreateRequest();

  const others = (family.data?.members ?? []).filter((m) => m.canActFor);
  const canChoose = others.length > 1;
  const [step, setStep] = useState<Step>('purpose');
  const [forId, setForId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState(p.purpose ?? '');
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const selfId = family.data?.me;
  const targetId = forId ?? selfId;
  const target = family.data?.members.find((m) => m.id === targetId);
  const total = canChoose ? 3 : 2;
  const pos = step === 'who' ? 1 : step === 'purpose' ? (canChoose ? 2 : 1) : canChoose ? 3 : 2;

  // Daftar keluarga dimuat setelah layar tampil: tawarkan "untuk siapa" sekali, bila ada pilihan.
  const offered = useRef(false);
  useEffect(() => {
    if (!offered.current && family.isSuccess && canChoose && !purpose) {
      offered.current = true;
      setStep('who');
    }
  }, [family.isSuccess, canChoose, purpose]);

  async function send() {
    setError(null);
    try {
      const r = await create.mutateAsync({
        templateId, purpose: purpose.trim(),
        ...(targetId && targetId !== selfId ? { forResidentId: targetId } : {}),
      });
      setCreatedId(r.id);
      setStep('done');
      void registerPush({ ask: true }); // momen kontekstual: "mau diberi tahu bila surat selesai?"
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Terjadi kesalahan. Coba lagi.');
    }
  }

  if (step === 'done' && createdId) {
    return (
      <Screen footer={<Button label="Lihat status surat" onPress={() => router.replace(`/surat/${createdId}`)} />}>
        <Title>Terkirim ke desa ✓</Title>
        <Body>{p.name} untuk {target?.name ?? 'Anda'} sudah dikirim. Perangkat desa akan memeriksanya.</Body>
        <Body muted>Anda akan diberi tahu lewat notifikasi saat ada perkembangan. Tidak perlu datang ke kantor desa dulu.</Body>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        step === 'who' ? <Button label="Lanjut" disabled={!targetId} onPress={() => setStep('purpose')} />
        : step === 'purpose' ? <Button label="Lanjut" disabled={purpose.trim().length < 3} onPress={() => setStep('review')} />
        : <Button label="Kirim ke Desa" loading={create.isPending} onPress={send} />
      }
    >
      <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 4 }}>Langkah {pos} dari {total}</Text>
      <Title>{p.name}</Title>
      <ErrorBanner message={error} />

      {step === 'who' ? (
        <>
          <Body>Surat ini untuk siapa?</Body>
          {others.map((m) => {
            const active = (forId ?? selfId) === m.id;
            return (
              <Card key={m.id} onPress={() => setForId(m.id)} label={`${m.name}${m.id === selfId ? ' (saya)' : ''}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 22 }}>{active ? '◉' : '○'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{m.name}{m.id === selfId ? ' (saya)' : ''}</Text>
                    <Text style={{ fontSize: 14, color: colors.textMuted }}>{m.relation}</Text>
                  </View>
                </View>
              </Card>
            );
          })}
        </>
      ) : null}

      {step === 'purpose' ? (
        <>
          <Body>Untuk keperluan apa? Data Anda (nama, NIK, alamat) sudah terisi otomatis dari data desa.</Body>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
            {QUICK_PURPOSES.map((q) => (
              <Pressable
                key={q}
                accessibilityRole="button"
                onPress={() => setPurpose(q === 'Lainnya' ? '' : q)}
                style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: purpose === q ? colors.primary : colors.border, backgroundColor: purpose === q ? '#E3F3EA' : colors.bg, justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 16, color: colors.text }}>{q}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Keperluan" value={purpose} onChangeText={setPurpose} autoCapitalize="sentences" multiline maxLength={300} hint="Jelaskan singkat, mis. melamar kerja di PT Maju Jaya" />
        </>
      ) : null}

      {step === 'review' ? (
        <>
          <Body>Periksa dulu sebelum dikirim.</Body>
          <Card>
            <Row k="Jenis surat" v={p.name ?? ''} />
            <Row k="Untuk" v={target ? `${target.name}${target.id === selfId ? ' (saya)' : ''}` : 'Saya'} />
            <Row k="Keperluan" v={purpose.trim()} />
          </Card>
          <Button label="Ubah" variant="link" onPress={() => setStep('purpose')} />
        </>
      ) : null}
    </Screen>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{k}</Text>
      <Text style={{ fontSize: 17, color: colors.text }}>{v}</Text>
    </View>
  );
}
