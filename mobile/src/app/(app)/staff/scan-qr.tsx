import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { Body, Button, ErrorBanner, Screen, Title } from '@/components/ui';
import { ApiError, post } from '@/lib/api';
import { spacing } from '@/theme';

/** Pindai QR absensi yang ditampilkan admin di web (berlaku 5 menit). */
export default function ScanQr() {
  const [perm, requestPerm] = useCameraPermissions();
  const qc = useQueryClient();
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ label: string; at: string } | null>(null);

  async function onScan(data: string) {
    if (busy.current || done) return;
    busy.current = true;
    setError(null);
    try {
      const r = await post<{ alreadyCheckedIn: boolean; statusLabel: string; checkInAt: string }>('/staff/attendance/check-in', { method: 'QR', token: data });
      void qc.invalidateQueries({ queryKey: ['att-today'] });
      void qc.invalidateQueries({ queryKey: ['att-history'] });
      setDone({ label: r.alreadyCheckedIn ? `Anda sudah absen hari ini (${r.statusLabel})` : `Absen berhasil · ${r.statusLabel}`, at: r.checkInAt });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Gagal absen. Coba lagi.');
      setTimeout(() => { busy.current = false; }, 2500); // beri jeda sebelum memindai ulang
      return;
    }
    busy.current = false;
  }

  if (done) {
    return (
      <Screen footer={<Button label="Selesai" onPress={() => router.back()} />}>
        <Title>{done.label} ✓</Title>
        <Body muted>Pukul {new Date(done.at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')}</Body>
      </Screen>
    );
  }

  if (!perm) return <Screen><Body muted>Memeriksa izin kamera…</Body></Screen>;
  if (!perm.granted) {
    return (
      <Screen footer={<Button label="Izinkan kamera" onPress={() => void requestPerm()} />}>
        <Title>Izin kamera</Title>
        <Body>Kamera dipakai hanya untuk memindai QR absensi di layar admin desa.</Body>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={(e) => void onScan(e.data)}
      />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <ErrorBanner message={error} />
        <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center', fontWeight: '600' }}>Arahkan kamera ke QR absensi</Text>
        <Text style={{ color: '#ddd', fontSize: 14, textAlign: 'center', marginTop: 4 }}>Minta admin menampilkan QR di menu Absensi web (berlaku 5 menit).</Text>
        <Button label="Batal" variant="link" onPress={() => router.back()} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}
