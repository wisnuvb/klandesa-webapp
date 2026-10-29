import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/text';

import { ContactVillageButton } from '@/components/contact';
import { Screen } from '@/components/ui';
import { colors, shadow, spacing } from '@/theme';

/** Jawaban ditulis sesuai fitur yang benar-benar ada di app; ubah di sini bila alurnya berubah. */
const FAQ: { q: string; a: string }[] = [
  { q: 'Bagaimana cara membuat surat?', a: 'Ketuk "Buat Surat" di Beranda, pilih jenis surat, pilih untuk siapa, isi keperluannya, lalu ketuk "Kirim ke Desa". Nama, NIK, dan alamat terisi otomatis dari data desa.' },
  { q: 'Berapa lama surat saya selesai?', a: 'Tergantung desa Anda. Pantau perkembangannya di "Urusan saya" pada Beranda. Anda juga mendapat notifikasi setiap ada perubahan, jadi tidak perlu bolak-balik ke kantor desa.' },
  { q: 'Bagaimana kalau tidak ada sinyal?', a: 'Surat atau laporan Anda tersimpan di HP dan dikirim otomatis saat sinyal kembali. Buka aplikasi sesekali agar pengirimannya jalan.' },
  { q: 'Bagaimana cara melapor masalah di desa?', a: 'Ketuk "Lapor Masalah" di Beranda, ambil foto, pilih jenis masalah, ceritakan singkat, lalu kirim. Anda bisa memilih menyembunyikan nama dari warga lain.' },
  { q: 'Saya lupa password. Apa yang harus dilakukan?', a: 'Di halaman masuk, ketuk "Lupa password?". Minta kode reset ke kantor desa atau ketua RT, atau isi data diri Anda seperti saat mendaftar.' },
  { q: 'Data keluarga saya salah. Bagaimana memperbaikinya?', a: 'Buka Saya, lalu Keluarga Saya, dan ketuk "Koreksi data ini" pada nama yang bersangkutan. Perangkat desa akan memeriksa permintaan Anda sebelum data diubah.' },
  { q: 'Apakah NIK saya aman?', a: 'NIK hanya dipakai untuk mencocokkan data dengan catatan desa Anda dan selalu ditampilkan tersamar. Data tidak dibagikan ke pihak lain.' },
  { q: 'Bagaimana cara menghapus akun?', a: 'Buka Saya, ketuk "Hapus Akun", lalu masukkan password Anda. Laporan dan surat yang sudah masuk tetap menjadi arsip desa, tetapi tanpa nama dan NIK Anda.' },
];

function Item({ q, a, first }: { q: string; a: string; first: boolean }) {
  const [openIt, setOpenIt] = useState(false);
  return (
    <View style={{ borderTopWidth: first ? 0 : 1, borderTopColor: colors.surface }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: openIt }}
        accessibilityLabel={q}
        onPress={() => setOpenIt((o) => !o)}
        style={({ pressed }) => [{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }, pressed && { backgroundColor: colors.surface }]}
      >
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.text }}>{q}</Text>
        <Ionicons name={openIt ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} />
      </Pressable>
      {openIt ? <Text style={{ fontSize: 16, lineHeight: 24, color: colors.text, paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>{a}</Text> : null}
    </View>
  );
}

export default function PusatBantuan() {
  return (
    <Screen background={colors.canvas}>
      <Text style={{ fontSize: 16, lineHeight: 23, color: colors.textMuted, marginBottom: spacing.md }}>Ketuk pertanyaan untuk melihat jawabannya.</Text>
      <View style={{ backgroundColor: colors.bg, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card }}>
        {FAQ.map((f, i) => <Item key={f.q} q={f.q} a={f.a} first={i === 0} />)}
      </View>
      <View style={{ marginTop: spacing.lg, backgroundColor: colors.primarySoft, borderRadius: 20, padding: spacing.md, gap: spacing.sm }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text }}>Masih bingung?</Text>
        <Text style={{ fontSize: 15, lineHeight: 21, color: colors.textMuted }}>Perangkat desa siap membantu di kantor desa pada jam layanan.</Text>
        <ContactVillageButton />
      </View>
    </Screen>
  );
}
