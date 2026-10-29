import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/components/text';
import { useQueryClient } from '@tanstack/react-query';

import { Card, Empty, SectionTitle } from '@/components/cards';
import { Body, Button, ErrorBanner, PageBand, Screen } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { useAttendanceHistory, useAttendanceToday } from '@/lib/queries';
import { colors, spacing } from '@/theme';

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
const monthKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const STATUS_COLOR: Record<string, string> = { PRESENT: colors.primary, LATE: '#B26A00', ABSENT: colors.textMuted, LEAVE: '#1565C0' };

export default function Absen() {
  const today = useAttendanceToday();
  const history = useAttendanceHistory(monthKey());
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = today.data;

  async function gps() {
    setBusy(true);
    setError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return setError('Izin lokasi ditolak. Aktifkan di pengaturan, atau absen dengan QR.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await post('/staff/attendance/check-in', {
        method: 'GPS', latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy ?? undefined, mocked: pos.mocked === true,
      });
      void qc.invalidateQueries({ queryKey: ['att-today'] });
      void qc.invalidateQueries({ queryKey: ['att-history'] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Lokasi belum terbaca. Pastikan GPS aktif, lalu coba lagi.');
    } finally {
      setBusy(false);
    }
  }

  const refresh = () => { void today.refetch(); void history.refetch(); };
  const s = history.data?.summary;

  return (
    <Screen header={<PageBand title="Absensi" />} onRefresh={refresh} refreshing={today.isRefetching}>
      {today.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
      {today.isError ? <ErrorBanner message={today.error instanceof ApiError ? today.error.message : 'Gagal memuat absensi.'} /> : null}
      <ErrorBanner message={error} />

      {t && !t.linked ? <ErrorBanner message={t.linkHint} /> : null}

      {t?.linked ? (
        <>
          <View style={{ backgroundColor: t.today ? '#E3F3EA' : colors.surface, borderRadius: 14, padding: spacing.md, marginBottom: spacing.md }}>
            {t.today ? (
              <>
                <Text style={{ fontSize: 20, fontWeight: '700', color: STATUS_COLOR[t.today.status] ?? colors.text }}>Sudah absen · {t.today.statusLabel}</Text>
                <Text style={{ fontSize: 16, color: colors.text, marginTop: 4 }}>Pukul {hhmm(t.today.checkInAt)}{t.today.method ? ` · ${t.today.method === 'QR' ? 'QR kantor' : 'GPS'}` : ''}</Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>Belum absen hari ini</Text>
                {t.shift ? <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 4 }}>{t.shift.name}: masuk {t.shift.start.slice(0, 5)} (toleransi {t.shift.tolerance} menit)</Text> : null}
              </>
            )}
          </View>

          {!t.today ? (
            <View style={{ gap: 12 }}>
              <Button label="Scan QR kantor" onPress={() => router.push('/staff/scan-qr')} disabled={busy} />
              {t.methods.gps ? (
                <Button label="Absen dengan GPS" variant="secondary" loading={busy} onPress={gps} />
              ) : (
                <Body muted>{t.methods.gpsInactiveReason ?? 'Absensi GPS tidak tersedia.'}</Body>
              )}
              {t.methods.gps && t.methods.radiusMeters ? <Body muted>Anda harus berada maksimal {t.methods.radiusMeters} meter dari kantor desa.</Body> : null}
            </View>
          ) : null}
        </>
      ) : null}

      {s ? (
        <>
          <SectionTitle>BULAN INI</SectionTitle>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[['Hadir', s.present, colors.primary], ['Terlambat', s.late, '#B26A00'], ['Izin', s.leave, '#1565C0']].map(([label, n, c]) => (
              <View key={label as string} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, fontWeight: '800', color: c as string }}>{n as number}</Text>
                <Text style={{ fontSize: 14, color: colors.textMuted }}>{label as string}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {t?.team?.length ? (
        <>
          <SectionTitle>REKAN HARI INI</SectionTitle>
          {t.team.map((m) => (
            <Card key={m.id} label={`${m.name}, ${m.statusLabel}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{m.name}</Text>
                  {m.position ? <Text style={{ fontSize: 14, color: colors.textMuted }}>{m.position}</Text> : null}
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: STATUS_COLOR[m.status] ?? colors.text }}>{m.statusLabel}{m.checkInAt ? ` ${hhmm(m.checkInAt)}` : ''}</Text>
              </View>
            </Card>
          ))}
        </>
      ) : t?.linked ? <Empty title="Belum ada data perangkat desa" /> : null}
    </Screen>
  );
}
