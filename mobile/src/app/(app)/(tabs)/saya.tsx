import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';
import { Text } from '@/components/text';

import { ActionSheet } from '@/components/action-sheet';
import { MenuGroup, SectionHeader } from '@/components/cards';
import { Button, PageBand, Screen } from '@/components/ui';
import { APP_VERSION, compareVersions, fetchRemoteConfig } from '@/lib/app-config';
import { ApiError } from '@/lib/api';
import { resolveApiBase } from '@/lib/api-base';
import { dialNumber } from '@/lib/format';
import { removeProfilePhoto, uploadProfilePhoto } from '@/lib/upload';
import { useHome, useRtRole } from '@/lib/queries';
import { FONT_SCALES, useFontScale } from '@/state/font-scale';
import { useSession } from '@/state/session';
import { colors, shadow, spacing } from '@/theme';

const open = (url: string) => void Linking.openURL(url);

/** Lencana kecil di kartu profil: peran dan desa. */
function Pill({ icon, label, tone = 'green' }: { icon: keyof typeof Ionicons.glyphMap; label: string; tone?: 'green' | 'gold' }) {
  const gold = tone === 'gold';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: gold ? colors.goldSoft : colors.primarySoft }}>
      <Ionicons name={icon} size={15} color={gold ? colors.goldText : colors.primary} />
      <Text style={{ fontSize: 14, fontWeight: '700', color: gold ? colors.goldText : colors.primary }}>{label}</Text>
    </View>
  );
}

/** Pilihan ukuran huruf. Tombol besar, ada teks dan tanda terpilih (bukan hanya warna); contoh kalimat langsung ikut berubah. */
function FontSizeCard() {
  const { key, setKey } = useFontScale();
  return (
    <View style={{ backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.md, ...shadow.card }}>
      <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
        {FONT_SCALES.map((o) => {
          const on = o.key === key;
          return (
            <Pressable
              key={o.key} onPress={() => setKey(o.key)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`Ukuran huruf ${o.label}`}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1.5, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : pressed ? colors.surface : colors.bg })}
            >
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.primary : colors.textMuted} />
              <Text style={{ fontSize: 16, fontWeight: on ? '700' : '500', color: colors.text }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontSize: 16, lineHeight: 24, color: colors.textMuted }}>Contoh: surat keterangan Anda sedang diperiksa kantor desa.</Text>
    </View>
  );
}

export default function Saya() {
  const { profile, signOut, updateAccount } = useSession();
  const home = useHome();
  const rt = useRtRole();
  const isStaff = profile?.account.type === 'staff';
  const unread = home.data?.unreadNotifications ?? 0;
  const name = profile?.account.name || 'Saya';
  const villagePhone = dialNumber(home.data?.village.phone);
  const site = resolveApiBase();
  const [update, setUpdate] = useState<{ busy: boolean; msg: string | null }>({ busy: false, msg: null });

  const photoUrl = profile?.account.photoUrl ?? null;
  const [sheet, setSheet] = useState(false);
  const [photo, setPhoto] = useState<{ busy: boolean; msg: string | null; ok: boolean }>({ busy: false, msg: null, ok: true });

  async function pickPhoto(source: 'camera' | 'library') {
    setPhoto({ busy: false, msg: null, ok: true });
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return setPhoto({ busy: false, ok: false, msg: 'Izin kamera ditolak. Anda bisa memilih foto dari galeri.' });
    }
    // allowsEditing + aspect 1:1 membuka layar potong bawaan HP, jadi hasilnya sudah persegi.
    const opts = { mediaTypes: 'images' as const, quality: 1, allowsEditing: true, aspect: [1, 1] as [number, number] };
    const r = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (r.canceled || !r.assets[0]) return;
    setPhoto({ busy: true, msg: null, ok: true });
    try {
      await updateAccount({ photoUrl: await uploadProfilePhoto(r.assets[0].uri) });
      setPhoto({ busy: false, ok: true, msg: 'Foto profil diperbarui.' });
    } catch (e) {
      setPhoto({ busy: false, ok: false, msg: e instanceof ApiError ? e.message : 'Foto belum tersimpan. Coba lagi.' });
    }
  }

  async function deletePhoto() {
    setPhoto({ busy: true, msg: null, ok: true });
    try {
      await removeProfilePhoto();
      await updateAccount({ photoUrl: null });
      setPhoto({ busy: false, ok: true, msg: 'Foto profil dihapus.' });
    } catch (e) {
      setPhoto({ busy: false, ok: false, msg: e instanceof ApiError ? e.message : 'Foto belum terhapus. Coba lagi.' });
    }
  }

  async function checkUpdate() {
    setUpdate({ busy: true, msg: null });
    const cfg = await fetchRemoteConfig();
    if (!cfg) return setUpdate({ busy: false, msg: 'Tidak bisa memeriksa sekarang. Periksa sinyal Anda lalu coba lagi.' });
    if (compareVersions(APP_VERSION, cfg.latestVersion) < 0) {
      setUpdate({ busy: false, msg: `Versi ${cfg.latestVersion} tersedia.` });
      return open(cfg.updateUrl);
    }
    setUpdate({ busy: false, msg: 'Anda sudah memakai versi terbaru.' });
  }

  const account = [
    { icon: 'notifications-outline' as const, title: 'Notifikasi', caption: 'Kabar surat, laporan, dan pengumuman', trailing: unread > 0 ? `${unread} baru` : undefined, onPress: () => router.push('/notifikasi') },
    ...(!isStaff ? [
      { icon: 'people-outline' as const, title: 'Keluarga Saya', caption: 'Data keluarga dan koreksi data', onPress: () => router.push('/keluarga') },
      { icon: 'gift-outline' as const, title: 'Bantuan Saya', caption: 'Program bantuan yang tercatat', onPress: () => router.push('/bantuan') },
    ] : []),
    ...(rt && !isStaff ? [{ icon: 'ribbon-outline' as const, title: `Masuk sebagai Ketua RT ${rt.rt}`, caption: 'Periksa pengantar surat warga RT Anda', onPress: () => router.push('/rt') }] : []),
  ];

  const village = [
    { icon: 'information-circle-outline' as const, title: 'Info Desa', caption: 'Kantor, perangkat, dan nomor penting', onPress: () => router.push('/info-desa') },
    ...(villagePhone ? [{ icon: 'call-outline' as const, title: 'Hubungi Kantor Desa', caption: home.data?.village.phone ?? undefined, onPress: () => open(`tel:${villagePhone}`) }] : []),
  ];

  const help = [
    ...(!isStaff ? [{ icon: 'help-circle-outline' as const, title: 'Pusat Bantuan', caption: 'Jawaban atas pertanyaan yang sering muncul', onPress: () => router.push('/pusat-bantuan') }] : []),
    ...(!isStaff ? [{ icon: 'ban-outline' as const, title: 'Akun Diblokir di Warga', caption: 'Atur akun yang Anda blokir', onPress: () => router.push('/warga/blokir') }] : []),
    ...(site ? [
      { icon: 'shield-checkmark-outline' as const, title: 'Kebijakan Privasi', external: true, onPress: () => open(`${site}/privacy-policy`) },
      { icon: 'document-text-outline' as const, title: 'Syarat Layanan', external: true, onPress: () => open(`${site}/terms-of-service`) },
    ] : []),
  ];

  return (
    <Screen
      background={colors.canvas}
      header={<PageBand title="Saya" />}
      footer={<Button label="Keluar" icon="log-out-outline" variant="secondary" onPress={() => void signOut()} />}
    >
      {/* Kartu profil */}
      <View style={{ backgroundColor: colors.bg, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center', ...shadow.card }}>
        <Pressable
          disabled={isStaff || photo.busy}
          onPress={() => setSheet(true)}
          accessibilityRole={isStaff ? undefined : 'button'}
          accessibilityLabel={isStaff ? undefined : photoUrl ? 'Ubah foto profil' : 'Tambah foto profil'}
          accessibilityState={{ busy: photo.busy }}
          style={{ width: 84, height: 84, marginBottom: spacing.md }}
        >
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primaryDeep, borderWidth: 3, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} accessibilityLabel={`Foto ${name}`} contentFit="cover" style={{ width: 78, height: 78 }} />
            ) : (
              <Text style={{ fontSize: 34, fontWeight: '800', color: '#fff' }}>{name.trim().charAt(0).toUpperCase()}</Text>
            )}
            {photo.busy ? (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,42,30,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#fff" accessibilityLabel="Menyimpan foto" />
              </View>
            ) : null}
          </View>
          {!isStaff ? (
            <View style={{ position: 'absolute', right: -4, bottom: -4, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          ) : null}
        </Pressable>
        {!isStaff && !photoUrl && !photo.busy && !photo.msg ? <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: spacing.sm }}>Ketuk untuk menambah foto</Text> : null}
        {photo.msg ? (
          <Text accessibilityRole="alert" style={{ fontSize: 14, fontWeight: '600', color: photo.ok ? colors.primary : colors.danger, textAlign: 'center', marginBottom: spacing.sm }}>{photo.msg}</Text>
        ) : null}
        <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' }} accessibilityRole="header">{name}</Text>
        {profile?.account.username ? <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 2 }}>@{profile.account.username}</Text> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md }}>
          <Pill icon={isStaff ? 'briefcase-outline' : 'person-outline'} label={isStaff ? 'Perangkat desa' : 'Warga'} />
          <Pill icon="location-outline" label={profile?.village.name ?? 'Desa'} />
          {rt && !isStaff ? <Pill icon="ribbon-outline" label={`Ketua RT ${rt.rt}${rt.rw ? ` / RW ${rt.rw}` : ''}`} tone="gold" /> : null}
        </View>
      </View>

      <ActionSheet
        visible={sheet}
        title="Foto profil"
        subtitle="Foto ini juga terlihat oleh perangkat desa di data warga."
        onClose={() => setSheet(false)}
        actions={[
          { icon: 'camera-outline', label: 'Ambil foto', onPress: () => void pickPhoto('camera') },
          { icon: 'images-outline', label: 'Pilih dari galeri', onPress: () => void pickPhoto('library') },
          ...(photoUrl ? [{ icon: 'trash-outline' as const, label: 'Hapus foto', danger: true, onPress: () => void deletePhoto() }] : []),
        ]}
      />

      <SectionHeader>Akun saya</SectionHeader>
      <MenuGroup items={account} />

      <SectionHeader>Desa</SectionHeader>
      <MenuGroup items={village} />

      <SectionHeader>Ukuran huruf</SectionHeader>
      <FontSizeCard />

      <SectionHeader>Bantuan dan privasi</SectionHeader>
      <MenuGroup items={help} />

      {!isStaff ? (
        <View style={{ marginTop: spacing.lg }}>
          <MenuGroup items={[{ icon: 'trash-outline', title: 'Hapus Akun', caption: 'Hapus akun Anda secara permanen', danger: true, onPress: () => router.push('/hapus-akun') }]} />
        </View>
      ) : null}

      {/* Versi app */}
      <View style={{ alignItems: 'center', marginTop: spacing.lg, gap: 2 }}>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>Klandesa versi {APP_VERSION}</Text>
        <Button label={update.busy ? 'Memeriksa…' : 'Cek pembaruan'} variant="link" loading={update.busy} onPress={() => void checkUpdate()} />
        {update.msg ? <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, textAlign: 'center' }} accessibilityRole="alert">{update.msg}</Text> : null}
      </View>
    </Screen>
  );
}
