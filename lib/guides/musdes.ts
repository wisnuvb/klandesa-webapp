/**
 * Isi panduan halaman Musyawarah Desa (/musdes): bahasa sehari-hari untuk perangkat desa.
 * Murni (tanpa React) agar bisa diuji. Semua pernyataan di sini bersumber dari kode: lib/musdes/{catalog,inclusion,service,schema}.ts
 * dan tampilan di app/(app)/musdes. Sengaja TIDAK memuat angka kuorum, tenggat, atau nomor pasal selain yang sudah tercantum di
 * katalog aplikasi: aturan itu menyangkut tata tertib desa/peraturan daerah dan tidak dihitung oleh aplikasi.
 * Contoh isian HANYA ditampilkan, tidak pernah disalin otomatis ke kolom.
 */
import type { FieldHelp, GuideEntry, PageGuide } from "./types";

export const MUSDES_GUIDE: PageGuide = {
  id: "musdes",
  title: "Panduan Musyawarah Desa",
  description: "Dari menjadwalkan rapat sampai berita acara final, dan apa yang terkunci di tiap tahap.",
  bannerText: "Baca panduan singkat (sekitar 3 menit): urutan kerja, arti status, dan kapan data terkunci.",
  tabs: [
    {
      id: "alur",
      label: "Alur kerja",
      blocks: [
        {
          type: "steps",
          title: "Urutan kerja dari awal sampai selesai",
          items: [
            { title: "Jadwalkan musyawarah", body: "Tekan \"Jadwalkan musyawarah\". Pilih jenis, isi judul dan tanggal. Jenis tidak bisa diubah setelah dibuat, jadi pilih dengan teliti." },
            { title: "Daftarkan peserta yang diundang", body: "Di rincian rapat, cari warga dari data desa atau ketik namanya, lalu pilih unsurnya. Untuk banyak orang sekaligus, pakai \"Tambah banyak sekaligus\" (satu nama per baris, paling banyak 100 nama sekali tambah)." },
            { title: "Cetak daftar hadir", body: "Tombol \"Daftar hadir\" membuka halaman cetak. Daftar hadir yang sudah ditandatangani bisa diunggah di bagian \"Dokumen musyawarah\"." },
            { title: "Setelah rapat, tandai terlaksana", body: "Tekan \"Tandai terlaksana\" dan cek tanggal pelaksanaannya. Mulai di sini keputusan dan berita acara bisa diisi." },
            { title: "Centang peserta yang hadir", body: "Boleh tekan \"Tandai semua hadir\" lebih dulu, lalu hilangkan centang orang yang tidak datang." },
            { title: "Catat keputusan", body: "Tulis satu keputusan per kali. Nomornya otomatis dan ikut tercetak di berita acara." },
            { title: "Tulis berita acara, lalu finalkan", body: "Isi nomor dan isi berita acara, tekan \"Simpan berita acara\". Bila sudah benar, tekan \"Finalkan berita acara\". Setelah final, isinya terkunci." },
            { title: "Cetak, tanda tangani, unggah", body: "Cetak berita acara, minta tanda tangan, lalu unggah hasil pindaiannya di \"Dokumen musyawarah\". Unggahan masih boleh ditambah setelah final." },
          ],
        },
      ],
    },
    {
      id: "status",
      label: "Status & kunci",
      blocks: [
        {
          type: "cards",
          title: "Apa yang bisa dilakukan di tiap status",
          items: [
            {
              title: "Dijadwalkan",
              body: "Rapat belum dilaksanakan.",
              facts: [
                { label: "Bisa", value: "Ubah jadwal dan pokok bahasan, tambah atau hapus peserta, tandai terlaksana, batalkan, atau hapus rapat." },
                { label: "Belum bisa", value: "Mencatat keputusan dan berita acara." },
              ],
            },
            {
              title: "Terlaksana (berita acara disusun)",
              body: "Rapat sudah berlangsung dan catatan resminya sedang disusun.",
              facts: [
                { label: "Bisa", value: "Ubah peserta dan kehadiran, catat keputusan, tulis berita acara, lalu finalkan." },
                { label: "Belum bisa", value: "Menghapus rapat. Rapat yang sudah terlaksana dianggap catatan resmi." },
              ],
            },
            {
              title: "Berita acara final",
              body: "Peserta, keputusan, dan isi berita acara terkunci.",
              facts: [
                { label: "Syarat final", value: "Isi berita acara minimal 20 huruf dan minimal satu peserta ditandai hadir." },
                { label: "Koreksi", value: "Hanya Kepala Desa atau admin yang dapat membuka kembali, dengan alasan (minimal 5 huruf) yang dicatat. Setelah itu berita acara harus difinalkan ulang." },
              ],
            },
            {
              title: "Dibatalkan",
              body: "Rapat batal tetapi tetap tercatat.",
              facts: [
                { label: "Syarat batal", value: "Hanya dari status Dijadwalkan, dengan alasan minimal 5 huruf." },
                { label: "Setelahnya", value: "Tidak bisa diubah lagi, tetapi masih boleh dihapus." },
              ],
            },
          ],
        },
        {
          type: "list",
          title: "Dipakai menu lain",
          items: [
            "RPJM Desa, BLT Desa, dan BUM Desa memilih musyawarah dari menu ini, jadi isi jenis dengan benar.",
            "Penetapan program BLT Desa menunggu musyawarah penetapan penerimanya berstatus Terlaksana atau Final.",
            "Checklist pendirian BUM Desa menunggu berita acara musyawarah pendiriannya berstatus Final.",
          ],
        },
      ],
    },
    {
      id: "peserta",
      label: "Peserta",
      blocks: [
        {
          type: "split",
          left: {
            title: "Terisi otomatis",
            items: [
              "Judul dan tahun rencana, saat jenis dipilih dan kolomnya masih kosong (tahun rencana: tahun depan, untuk jenis perencanaan)",
              "Nama dan jenis kelamin peserta, bila dipilih dari data warga",
              "Jumlah diundang, hadir, dan perempuan hadir",
              "Nomor urut keputusan",
              "Tanggal pelaksanaan, mengikuti tanggal jadwal bila tidak diubah",
              "Catatan keterwakilan peserta",
            ],
          },
          right: {
            title: "Anda yang mengisi",
            items: [
              "Unsur tiap peserta",
              "Siapa saja yang hadir",
              "Bunyi keputusan",
              "Isi dan nomor berita acara",
              "Acara dan pokok bahasan",
            ],
          },
        },
        {
          type: "list",
          title: "Catatan keterwakilan: apa maksudnya",
          items: [
            "Aplikasi mengecek apakah peserta sudah mewakili unsur yang seharusnya ada. Sebelum rapat dihitung dari semua yang diundang; setelah terlaksana, dari yang hadir saja.",
            "Yang dicek hanya jenis perencanaan (termasuk Musrenbangdes dan perubahan) dan jenis BLT Desa. Jenis BUM Desa dan lainnya tidak dicek.",
            "Untuk semua jenis yang dicek: perempuan, perwakilan masyarakat miskin, penyandang disabilitas, dan kelompok pemerhati dan pelindungan anak. Perempuan dianggap ada bila jenis kelamin P atau unsurnya kelompok perempuan.",
            "Bila penyelenggaranya BPD, minimal satu anggota BPD harus ada di daftar. Untuk Musrenbangdes dan perubahan, Pemerintah Desa dan sepuluh unsur masyarakat juga dicek.",
            "Catatan ini tidak pernah menghalangi menyimpan atau memfinalkan. Gunanya mengingatkan; bila ada unsur yang memang tidak bisa hadir, jelaskan di berita acara.",
          ],
        },
      ],
    },
    {
      id: "istilah",
      label: "Istilah & tips",
      blocks: [
        {
          type: "glossary",
          title: "Istilah yang sering muncul",
          items: [
            { term: "Musdes", meaning: "Musyawarah Desa: rapat besar desa untuk memutuskan hal penting bersama wakil masyarakat." },
            { term: "Musrenbangdes", meaning: "Musyawarah perencanaan pembangunan desa; diselenggarakan oleh Kepala Desa." },
            { term: "BPD", meaning: "Badan Permusyawaratan Desa. Beberapa jenis musyawarah diselenggarakan oleh BPD; penyelenggaranya tampil di bawah pilihan jenis." },
            { term: "Unsur", meaning: "Kelompok yang diwakili seorang peserta, misalnya tokoh agama atau kelompok perempuan." },
            { term: "Pokok bahasan", meaning: "Satu kalimat tentang apa yang dibahas di rapat ini." },
            { term: "Tahun rencana", meaning: "Tahun yang rencananya dibahas, bila rapat terkait rencana tahunan." },
            { term: "Berita acara", meaning: "Catatan resmi jalannya rapat dan hasil kesepakatannya." },
            { term: "Finalkan", meaning: "Mengunci peserta, keputusan, dan isi berita acara agar tidak berubah lagi tanpa jejak." },
          ],
        },
        {
          type: "list",
          title: "Tips",
          items: [
            "Salah memilih jenis? Selama masih Dijadwalkan, hapus rapatnya lalu buat ulang dengan jenis yang benar.",
            "Daftar keputusan dan jumlah hadir tercetak otomatis di berita acara. Di isi berita acara cukup ceritakan jalannya rapat.",
            "\"Simpan & finalkan\" menyimpan isian terbaru lebih dulu, lalu meminta konfirmasi sebelum mengunci.",
            "Periksa daftar hadir sebelum memfinalkan; mengoreksinya setelah final butuh Kepala Desa atau admin.",
            "Aplikasi tidak menghitung kuorum atau jumlah minimal peserta. Ikuti tata tertib musyawarah desa Anda.",
          ],
        },
        { type: "note", text: "Dasar aturan tiap jenis tampil di bawah pilihan jenis dan di rincian rapat, sesuai katalog aplikasi." },
      ],
    },
  ],
};

/**
 * Petunjuk kolom. Kunci = atribut `id` elemen kolom di halaman (bukan nama field), supaya mudah dicocokkan dengan
 * `aria-describedby="${id}-hint"`. Hanya kolom yang membingungkan.
 */
const FIELD_HELP: Record<string, FieldHelp> = {
  "md-kind": {
    tip: "Pilih sesuai tujuan rapat. Jenis menentukan penyelenggara, dasar aturan yang tampil, dan unsur peserta yang dicek. Tidak bisa diubah setelah dibuat.",
  },
  "md-topic": {
    tip: "Satu kalimat tentang hal yang akan dibahas. Tampil di rincian rapat.",
    example: "Pembahasan usulan kegiatan pembangunan tahun … dari tiap dusun.",
  },
  "md-agenda": {
    tip: "Urutan acara rapat. Ikut tercetak di berita acara.",
    example: "1. Pembukaan; 2. Pemaparan …; 3. Tanggapan peserta; 4. Kesepakatan; 5. Penutupan.",
  },
  "pa-unsur": {
    tip: "Unsur: kelompok yang diwakili peserta ini. Pilihan ini dipakai aplikasi untuk mengecek keterwakilan. Bila tidak masuk kelompok mana pun, biarkan \"Warga / unsur masyarakat lain\".",
    example: "Peserta yang hadir sebagai wakil kelompok … → pilih unsur \"Perwakilan kelompok …\" yang sesuai.",
  },
  "ba-text": {
    tip: "Ceritakan jalannya rapat: siapa yang membuka, apa yang dipaparkan, tanggapan peserta, dan hal yang disepakati. Keputusan dan jumlah hadir tercetak otomatis, tidak perlu diketik ulang. Minimal 20 huruf agar bisa difinalkan.",
    example: "Musyawarah dibuka oleh … pukul …. … memaparkan …. Peserta menanggapi …. Setelah dibahas, peserta bersepakat …. Musyawarah ditutup pukul ….",
  },
  "dec-new": {
    tip: "Tulis satu keputusan per kali, satu atau dua kalimat, sesuai yang disepakati. Nomor otomatis. Bisa diubah atau dihapus sampai berita acara difinalkan.",
    example: "Menyepakati … sebagai … untuk tahun ….",
  },
};

/** Petunjuk untuk kolom dengan `id` tertentu; undefined bila kolom itu tidak diberi petunjuk. */
export function musdesFieldHelp(fieldId: string): FieldHelp | undefined {
  return FIELD_HELP[fieldId];
}

/** Semua id kolom yang diberi petunjuk (dipakai tes agar tidak ada kunci yatim). */
export const MUSDES_HELP_FIELD_IDS: readonly string[] = Object.keys(FIELD_HELP);

export const MUSDES_GUIDE_ENTRY: GuideEntry = {
  guide: MUSDES_GUIDE,
  href: "/musdes",
  summary: "Urutan kerja dari menjadwalkan rapat sampai berita acara final, arti status, dan catatan keterwakilan peserta.",
};
