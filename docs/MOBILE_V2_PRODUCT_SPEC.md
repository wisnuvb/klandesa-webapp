# Klandesa Mobile v2 — Spesifikasi Produk (UX-first, mulai dari nol)

> Draf 2026-10-22. Melengkapi `MOBILE_V2_PLAN.md` (teknis/arsitektur). Dokumen ini **mengabaikan app Flutter lama**: tidak ada layar, alur, atau istilah yang dipertahankan. Satu-satunya hal dari app lama yang tetap relevan adalah **±10.000 akun warga** (urusan migrasi akun, bukan desain).
> **Status klaim:** poin "kebutuhan warga" di bawah adalah **hipotesis** dari kapabilitas backend + pola hidup warga desa. Wajib divalidasi (§11) sebelum desain visual dikunci. Hipotesis yang salah lebih mahal daripada layar yang salah.

---

## 1. Sudut pandang: apa yang sebenarnya dibutuhkan warga

Warga tidak butuh "aplikasi desa". Warga butuh **menyelesaikan urusan dengan desa tanpa repot**, dan **merasa didengar**. Jadi ukuran produk bukan jumlah fitur, tapi: *berapa kali warga berhasil menyelesaikan satu urusan tanpa datang ke kantor desa / tanpa bertanya di grup WhatsApp.*

### 1.1 Jobs-to-be-done (urut frekuensi × nyeri, hipotesis)

| # | Saat warga… | …ia ingin | Nyeri sekarang | Fitur |
|---|-------------|-----------|----------------|-------|
| J1 | butuh surat (domisili, SKTM, pengantar SKCK/KTP/KK, usaha) | surat jadi tanpa bolak-balik RT → kantor desa, tahu sudah sampai mana | Antre, jam kantor, kades tak di tempat, tak tahu status | **Surat** |
| J2 | melihat masalah (jalan rusak, lampu mati, sampah, banjir) | melapor cepat dan tahu ditindaklanjuti | Lapor lisan/WA tak tercatat, tak ada kabar | **Lapor** |
| J3 | ada kabar penting (kerja bakti, bantuan cair, posyandu, pemadaman, bencana) | tahu tepat waktu, dari sumber resmi | Info berantai di grup WA, terlewat/hoaks | **Kabar** |
| J4 | ingin tahu hak/bantuannya (BLT, PKH, BPNT, KIS, beasiswa) | tahu program apa yang ia ikuti / cara daftar | Tidak tahu, harus tanya perangkat | **Bantuan** |
| J5 | butuh datanya benar (KK, NIK, status) | melihat dan mengoreksi data keluarganya | Salah data baru ketahuan saat butuh | **Keluarga** |
| J6 | curiga/penasaran soal uang desa | melihat ringkas dana desa dipakai untuk apa | Tidak transparan | **Dana Desa** |
| J7 | perlu menghubungi desa/RT/darurat | nomor & jam layanan yang benar, 1 tap | Nomor berubah-ubah, tak tahu siapa dihubungi | **Kontak** |
| J8 | punya usaha/produk | dikenal warga lain | Tidak ada wadah | *Fase 3* |

**Aturan potong fitur:** fitur masuk v2 hanya jika (a) terkait J1–J7, (b) dipakai minimal bulanan oleh mayoritas warga *atau* bernilai tinggi saat dipakai (surat, darurat), dan (c) desa bisa menindaklanjutinya tanpa menambah beban kerja besar. Semua yang lain ditunda.

### 1.2 Siapa warga kita (menentukan seluruh keputusan UI)

- Android entry-level (RAM 2–3 GB, layar 5–6", storage penuh), data seluler terbatas, sinyal naik-turun.
- Rentang usia lebar; banyak yang **tidak nyaman mengetik**, tidak ingat password, dan membaca teks panjang.
- Terbiasa dengan WhatsApp/Facebook/TikTok: pola *feed*, tombol hijau besar, kirim foto, suara.
- Kepala keluarga sering mengurus untuk keluarga (istri/orang tua/anak), bukan hanya dirinya.
- Mengurus surat biasanya **untuk keperluan lain** (melamar kerja, bank, sekolah) — ada tenggat; cemas bila lama.

---

## 2. Prinsip desain (jadi aturan review setiap layar)

1. **Satu layar = satu tujuan = satu tombol utama.** Tidak ada layar dengan dua aksi sama-penting.
2. **Bahasa kantor desa, bukan bahasa software.** "Buat Surat", bukan "Submit Request". "Sudah di meja Pak Kades", bukan "PENDING_DESA".
3. **Jangan minta data yang sudah kita punya.** Nama, NIK, alamat, TTL terisi otomatis dari data warga; warga hanya menambah *keperluan*.
4. **Status selalu terlihat dan selalu ada "langkah berikutnya".** Warga tidak pernah bertanya "ini kenapa?".
5. **Gagal harus aman.** Tanpa sinyal: draf tersimpan, kirim otomatis saat online. Jangan pernah menghilangkan ketikan/foto warga.
6. **Ramah mata & jempol:** teks dasar ≥16sp (opsi "Huruf Besar" ≥20sp), tombol ≥56dp, kontras ≥ 4.5:1, ikon selalu berlabel, area sentuh lega, tombol utama di **bawah** (jangkauan jempol).
7. **Cepat di HP murah:** beranda tampil <2 dtk dari cache, gambar dikompres, tidak ada animasi berat, ukuran APK kecil (<40 MB target).
8. **Terpercaya:** tampilkan nama desa, logo & kepala desa di setiap layar penting; surat ada QR yang bisa dicek instansi lain. Warga lebih percaya "app resmi desa saya" daripada app generik.
9. **Privasi default:** NIK selalu disamarkan; hanya tampil penuh saat perlu dan tidak bisa di-screenshot di layar tertentu.

---

## 3. Struktur app (Information Architecture) — warga

Bottom tab **4 tab saja** (lansia kewalahan pada >4). Setelah fitur **Warga** (sosial desa, §14) masuk, Surat dan Lapor digabung menjadi satu tab **Layanan**:

```
┌───────────────────────────────────────────────┐
│  🏠 Beranda   🧾 Layanan   👥 Warga   👤 Saya  │
└───────────────────────────────────────────────┘
```
(Sebelum §14 dirilis: Beranda · Surat · Lapor · Saya. Di tab **Layanan**: dua tombol besar Surat / Lapor di atas, lalu "Urusan saya" dan riwayat.)

| Tab | Isi | Mengapa di sini |
|-----|-----|-----------------|
| **Beranda** | Sapaan + nama desa · "Urusan saya" (surat/laporan aktif) · Kabar desa · Pintasan (Bantuan, Dana Desa, Kontak, Darurat) | Titik masuk; menjawab "ada apa dengan urusan saya & desa hari ini" |
| **Surat** | Mulai surat baru · Surat populer di desa ini · Riwayat | J1 — fitur utama, harus 1 tap dari mana pun |
| **Lapor** | Buat laporan · Laporan saya · Laporan warga (publik) | J2 |
| **Saya** | Keluarga · Bantuan saya · Notifikasi · Pengaturan · Bantuan/Hubungi desa | Semua yang bersifat personal |

Hal-hal lain (Dana Desa, Profil Desa, Perangkat, Kontak, Darurat) **bukan tab**, melainkan kartu di Beranda → layar **"Info Desa"** — agar tab bar tetap sederhana.

Tombol **Darurat** (ikon merah di pojok Beranda): nomor Kades/RT/ambulans/pemadam/polsek desa tersebut, 1 tap telepon. Tanpa fitur "panic button" otomatis di v2 (risiko salah-tekan + tanggung jawab hukum).

---

## 4. Alur & layar kunci (dengan wireframe teks)

### 4.1 Pertama kali: Pilih desa → Daftar/Masuk

Tujuan: dari buka app sampai Beranda **<2 menit**, tanpa baca teks panjang.

```
[Layar 1: Selamat Datang]
  Logo Klandesa
  "Urusan desa, lewat HP."
  [ Masuk ]   [ Daftar Warga Baru ]
  (kecil) "Punya kode dari desa? Ketik di sini"
```
**Masuk:** Username · Password (ikon mata) · [Masuk] · "Lupa password?"
**Daftar (3 langkah, progress "1 dari 3"):**
1. *Pilih desa* — cari nama desa/kecamatan (hasil terdekat via lokasi kasar opsional). Tampil logo + nama kades supaya yakin benar.
2. *Buktikan Anda warga* — NIK · Tanggal lahir (picker) · Nama ibu kandung. Atau "Pakai kode dari desa" (ketik/scan). Teks bantu: *"Data hanya dicocokkan dengan data desa Anda."* Gagal → pesan netral + "Minta bantuan perangkat desa" (kirim permintaan manual).
3. *Buat akun* — Username (cek ketersediaan real-time) · Password (indikator kekuatan) · [Selesai].
Berhasil → ucapan "Selamat datang, Bu Siti 👋" → Beranda. **Tidak ada** langkah izin notifikasi/lokasi di tengah pendaftaran; minta izin **kontekstual** (notifikasi saat pertama mengirim surat: "Mau diberi tahu bila surat selesai?").

*Lansia:* petugas desa membantu dengan lembar kode; layar "Ketik kode" besar dan tahan salah ketik (huruf O/0 dianggap sama).

### 4.2 Beranda

```
┌───────────────────────────────┐
│ Desa Sukamaju      🔔(2)  🆘  │  ← nama desa selalu terlihat; lonceng; darurat
│ Selamat pagi, Bu Siti         │
│                               │
│ URUSAN SAYA                   │
│ ┌───────────────────────────┐ │
│ │ 📄 Surat Domisili         │ │
│ │ ● ● ◐ ○  Menunggu Pak Kades│ │  ← 4 titik progres + kalimat manusia
│ │ Perkiraan selesai: besok  │ │
│ └───────────────────────────┘ │
│ ┌ 📣 Lampu jalan RT 03   Diproses ┐
│                               │
│ MAU URUS APA?                 │
│ [Buat Surat] [Lapor Masalah]  │  ← dua tombol besar
│                               │
│ KABAR DESA                    │
│ ▢ Kerja bakti Minggu, 07.00…  │
│ ▢ BLT tahap 3 mulai dicairkan │
│                               │
│ INFO DESA  [Bantuan][Dana Desa]│
│            [Perangkat][Kontak] │
└───────────────────────────────┘
```
- Jika tak ada urusan aktif: bagian "Urusan Saya" diganti ajakan lembut ("Belum ada urusan. Butuh surat?").
- Kabar penting (isPinned) tampil sebagai banner di atas. Kabar bisa dibagikan ke WhatsApp (tombol bagikan) — memanfaatkan kebiasaan yang ada.
- Pull-to-refresh; tampil dari cache dulu (+ label "Diperbarui 10 menit lalu" bila offline).

### 4.3 Surat (fitur inti) — alur 4 langkah

**Tab Surat:** Cari surat 🔍 · **Paling sering diajukan di desa Anda** (5 kartu besar dari agregat) · Semua jenis (A–Z) · Riwayat.

**Buat surat** (wizard, progres jelas, bisa simpan draf):
1. **Untuk siapa?** — "Diri sendiri" (default) / anggota keluarga (dipilih dari KK).
2. **Keperluan** — pilihan cepat (Melamar kerja, Bank, Sekolah, Lainnya) + kolom singkat. Isi sesuai jenis surat: hanya field yang **tidak bisa** diambil otomatis.
3. **Lampiran** (bila perlu) — foto KTP/KK/pendukung via kamera dengan panduan bingkai; pratinjau & ulang; kompres otomatis. Bila data sudah ada di sistem → *"KK sudah ada di data desa, tidak perlu unggah"*.
4. **Periksa & kirim** — ringkasan satu layar ("Surat Domisili untuk Siti A, keperluan Bank"), [Kirim ke Desa]. Konfirmasi: *"Terkirim. Kami akan kabari saat ada perkembangan."*

**Layar Detail Surat (paling penting untuk rasa tenang):**
```
Surat Keterangan Domisili            No. KSK-…
● Terkirim   ● Dicek RT   ◐ Di meja Kades   ○ Selesai
─────────────────────────────────
Sekarang: Menunggu tanda tangan Pak Kades
Sejak: Selasa 09.15 · Biasanya selesai ≤ 1 hari kerja
Riwayat:
  Selasa 14.02  Disetujui Pak RT 03
  Selasa 09.15  Terkirim
[ Hubungi Kantor Desa ]
```
Saat selesai: **[Unduh PDF]** · [Bagikan] · [Tampilkan QR]. Jenis surat yang harus diambil fisik: status "Siap diambil di kantor desa, jam 08–14, bawa KTP". Ditolak: alasan jelas + tombol **[Perbaiki & Kirim Lagi]** (data terisi ulang).

Aturan UX surat: bahasa status manusiawi; perkiraan waktu berdasarkan median 30 hari desa tsb; satu surat aktif per jenis yang sama (cegah dobel) dengan peringatan ramah.

### 4.4 Lapor

**Buat laporan (<60 detik):**
1. **Foto** (kamera langsung terbuka; maks 3) — foto adalah isi utama.
2. **Apa masalahnya?** — kategori ikon besar (Jalan/Drainase, Lampu, Sampah, Air, Keamanan, Lainnya) + opsi **rekam suara** atau ketik singkat.
3. **Di mana?** — otomatis lokasi saat ini (peta mini, bisa digeser) atau RT/dusun; tanpa izin lokasi → pilih RT manual.
4. **Pengaturan:** Tampilkan nama saya / Anonim ke warga lain · Publik / Hanya ke perangkat desa. [Kirim]

**Laporan Saya:** timeline `Diterima → Diproses → Selesai/Ditolak` + tanggapan perangkat (dengan foto "setelah" bila ada). Setelah *Selesai*, tanya satu pertanyaan: *"Masalahnya sudah beres?"* [Ya] [Belum] → **Belum** membuka kembali laporan (umpan balik yang membuat desa akuntabel).
**Laporan Warga (publik):** daftar laporan publik desa; tombol 👍 "Saya juga mengalami" untuk menggabungkan duplikat dan memberi prioritas pada perangkat.

### 4.5 Kabar Desa
Feed sederhana: judul, gambar, tanggal, kategori (Pengumuman, Kegiatan, Bantuan, Kesehatan). Detail: teks mudah dibaca, [Bagikan ke WhatsApp], [Tambah ke kalender] untuk kegiatan bertanggal. Tanda "baru". Interaksi warga (komentar, like) ada di tab **Warga** (§14), bukan di Kabar Desa resmi.

### 4.6 Bantuan Saya
Daftar program yang **tercatat** menyertakan NIK/KK warga (`SocialBenefitBeneficiary`): nama program, status, periode. Tidak tercatat → panel "Mungkin Anda berhak" yang menjelaskan syarat & cara mengajukan lewat RT/desa (konten editorial per program). Disclaimer: *"Data berasal dari catatan desa; keputusan akhir ada pada instansi penyalur."* Tidak ada klaim kelayakan real-time.

### 4.7 Keluarga Saya
Kartu Keluarga: kepala keluarga + anggota (foto opsional, hubungan, umur). Tiap anggota: [Buat surat untuk ini]. **Koreksi data:** pilih field → isi nilai benar → unggah bukti → status pengajuan ("Menunggu verifikasi desa"). Warga **tidak mengedit langsung** data induk.

### 4.8 Dana Desa (transparansi)
Satu layar visual: "Dana Desa 2026: Rp X · Terpakai Y% (donut)" → kategori belanja (Infrastruktur, Kesehatan, Pemberdayaan, Pemerintahan) dalam bar sederhana → daftar kegiatan utama. Bahasa awam, tanpa istilah akuntansi. Sumber: agregat `Budget`/`Transaction` yang ditandai *publik* oleh desa (desa harus bisa memilih apa yang ditampilkan).

### 4.9 Saya / Pengaturan
Profil singkat · Ubah password · Kunci biometrik (opsional) · Notifikasi (per jenis: Surat, Laporan, Kabar; jam tenang) · **Ukuran huruf** (Normal/Besar/Sangat Besar, pratinjau langsung) · Bantuan (FAQ 8 pertanyaan, "Hubungi Kantor Desa") · Kebijakan privasi · **Hapus akun**. Versi app + tombol "Cek pembaruan".

---

## 5. Notifikasi (harus berarti, bukan spam)

| Pemicu | Isi (contoh) | Prioritas |
|--------|--------------|-----------|
| Status surat berubah | "Surat Domisili Anda sudah ditandatangani. Bisa diunduh." | Tinggi |
| Surat ditolak | "Surat Anda perlu diperbaiki: foto KK buram." | Tinggi |
| Laporan ditanggapi/selesai | "Lampu jalan RT 03 sudah diperbaiki." | Tinggi |
| Pengumuman penting/bencana | "Banjir: warga RT 02 diminta bersiap evakuasi." | Tinggi (bunyi) |
| Kegiatan besok | "Besok kerja bakti jam 07.00." | Normal |
| Pengumuman umum | — | Digest, maks 1 per hari |
Aturan: maks 3 push/hari kecuali darurat; jam tenang 21.00–05.00; tiap push membuka **layar tepat** yang relevan (deep link); kotak masuk di app menyimpan semuanya.

---

## 6. Konten & nada (UX writing)

- Sapaan sesuai jenis kelamin/usia bila datanya ada ("Bu Siti", "Pak Budi"); bila tidak, nama saja.
- Kalimat aktif, pendek, hangat tapi tidak menggurui. Contoh error: ❌ "Error 500" → ✅ "Maaf, sedang ada gangguan. Data Anda aman, coba lagi sebentar."
- Tidak ada singkatan teknis. Istilah resmi dijelaskan sekali ("SKTM — Surat Keterangan Tidak Mampu").
- Setiap layar kosong punya ilustrasi sederhana + satu langkah ("Belum ada laporan. [Buat Laporan]").
- Tombol berupa kata kerja: "Kirim ke Desa", "Unduh Surat", bukan "OK/Submit".

---

## 7. Keadaan sulit (selalu didesain, bukan afterthought)

| Keadaan | Perilaku |
|---------|----------|
| Offline | Beranda/riwayat dari cache; membuat surat/laporan tetap bisa → masuk antrean "Menunggu sinyal" dengan ikon jelas; otomatis terkirim |
| Upload foto gagal | Tersimpan lokal, coba ulang otomatis, tombol manual |
| Desa belum berlangganan/nonaktif | Layar ramah: "Layanan digital desa sedang tidak aktif. Silakan hubungi kantor desa." + kontak (tidak menampilkan kata "langganan") |
| Data warga belum lengkap/tidak ditemukan | Jalur manual + kontak perangkat desa |
| Akun dikunci (salah password berulang) | Pesan jelas + waktu tunggu + opsi reset via kode desa |
| Versi app terlalu lama | Layar "Perbarui aplikasi" (force update), tidak ada crash |
| HP lambat/memori kecil | Daftar virtualisasi, gambar bertahap, tanpa blur/shadow berat |

---

## 8. Aksesibilitas

TalkBack (label semua kontrol), ukuran huruf sistem dihormati hingga 200%, kontras tinggi, tidak mengandalkan warna saja untuk status (ikon + teks), target sentuh ≥56dp, tidak ada gestur tersembunyi (swipe-only), konfirmasi sebelum aksi destruktif, timeout sesi tidak mengusir pengisi form.

---

## 9. Peran lain (ringkas — detail di fase 2)

Satu app, **peran menentukan tampilan**. Warga yang juga RT / perangkat melihat pengalih peran di tab **Saya** ("Masuk sebagai Ketua RT 03").

- **Perangkat desa:** tab *Antrean* (surat butuh tindakan, pengaduan baru) · *Absen* · *Kabar* (buat pengumuman) · *Warga* (cari). Prinsip: **tindakan dalam ≤2 tap dari notifikasi** — buka notif → lihat ringkasan → [Setujui]/[Tolak + alasan].
- **Ketua RT:** tab *Pengantar* (permohonan warga RT-nya) · *Warga RT* · *Kabar RT*. Satu layar per permohonan dengan data pemohon dan [Kenal & Setujui]/[Tolak].
- Tingkat RW → pusat: dashboard baca-saja (fase 3).

---

## 10. Cakupan fitur final (disaring)

| Masuk v2.0 (warga) | Alasan |
|--------------------|--------|
| Daftar/Masuk, Beranda, Surat, Lapor, Kabar, Keluarga (lihat + koreksi), Bantuan Saya, Dana Desa, Kontak & Darurat, Notifikasi, Pengaturan (termasuk ukuran huruf & hapus akun) | Memenuhi J1–J7 |

| Ditunda | Alasan |
|---------|--------|
| Chat pribadi (DM), marketplace/UMKM, iuran/pembayaran, posyandu/kesehatan, pertanian/harga pangan, galeri, e-voting/musdes, AI asisten, mode multi-desa | Belum terbukti dibutuhkan; menambah beban moderasi/uang/regulasi. Evaluasi setelah data pemakaian 3 bulan |
| TTE resmi, integrasi Dukcapil/e-KTP | Regulasi/akses belum ada |

**Yang sengaja dibuang dari pola umum "app desa":** halaman profil desa panjang (jadikan satu layar Info Desa), galeri, menu bertumpuk >2 level, kuis/gamifikasi, login sosial.

---

## 11. Validasi sebelum desain visual (1–2 minggu, murah)

1. **Wawancara 12–15 orang** di 2–3 desa client: 6 warga biasa (campur usia/pekerjaan), 3 lansia/ibu rumah tangga, 2 perangkat desa, 2 Ketua RT, 1 kades. Pertanyaan inti (bukan "fitur apa mau?"): *"Ceritakan terakhir kali Anda mengurus surat/melapor ke desa — mulai dari mana, siapa yang dihubungi, apa yang menyulitkan?"*; *"Kabar desa Anda dapat dari mana?"*; *"Apa yang membuat Anda berhenti memakai app desa sebelumnya?"* (untuk yang ±10.000 pengguna lama — **informasi paling berharga**: mengapa tidak optimal).
2. **Data produksi:** jenis surat terbanyak per desa, waktu rata-rata proses, rasio pengaduan selesai, dari tabel `MailRequest`/`CitizenReport`.
3. **Uji prototipe klik (Figma / Expo prototype) 5 warga per putaran**, tugas: *"Buat surat domisili"*, *"Laporkan lampu jalan mati"*, *"Cari tahu status surat Anda"*. Lulus bila ≥4/5 sukses tanpa dibantu dan <3 menit.
4. Keputusan go/no-go per fitur memakai aturan potong di §1.1.

---

## 12. Metrik keberhasilan

| Metrik | Target 3 bulan pasca-rilis (per desa pilot) |
|--------|----------------------------------------------|
| Aktivasi (warga terdaftar / warga yang datanya ada) | ≥ 30% |
| Keberhasilan pendaftaran (mulai → selesai) | ≥ 80% |
| Surat diajukan via app dibanding total surat | ≥ 40% |
| Median waktu surat selesai | turun ≥ 50% dibanding manual |
| Laporan yang ditanggapi < 3 hari | ≥ 80%; "Beres" menurut pelapor ≥ 70% |
| Retensi D30 | ≥ 35% |
| Crash-free sessions | ≥ 99% |
| Pengguna lama (±10.000) yang login ulang dalam 30 hari | ≥ 50% |
| Skor kepuasan pasca-surat (1 pertanyaan 👍/👎) | ≥ 85% 👍 |

---

## 13. Urutan kerja yang disarankan

1. Validasi lapangan (§11) — paralel dengan Fase 0 teknis (`MOBILE_V2_PLAN.md`).
2. Kerangka alur klik (wireframe low-fi) untuk 4 alur: daftar, buat surat, lacak surat, lapor.
3. Sistem desain kecil: warna (aman untuk kontras), tipografi (Inter/serupa, skala tiga ukuran huruf), 12 komponen inti (tombol, kartu urusan, timeline status, field form, kartu kabar, empty/error state, bottom sheet, toast, stepper, banner offline, avatar, kartu program).
4. Bangun slice vertikal: **Daftar → Beranda → Surat end-to-end** dengan satu jenis surat di satu desa pilot → uji dengan warga nyata → baru lanjut Lapor dan sisanya.

---

## 14. Warga — sosial desa ala Instagram (permintaan 2026-10-22)

### 14.1 Penilaian jujur

**Potensi:** tinggi. Warga sudah hidup di Facebook/WhatsApp/TikTok; kabar kegiatan, panen, usaha, dan foto kegiatan desa adalah konten yang memang ingin mereka bagikan. Ini bisa menjadi alasan membuka app **setiap hari** (surat hanya sesekali), dan membuat desa lebih "hidup" bagi kades — nilai jual untuk perpanjangan langganan.

**Risiko (nyata, bukan teoretis):** konten buatan pengguna (UGC) membawa tanggung jawab. Hoaks, SARA, politik (pilkades!), fitnah/gosip tetangga, foto anak, judi/pinjol/penipuan, pornografi. Kades/admin desa yang akan jadi sasaran komplain, dan UU ITE berlaku. Ini bukan masalah teknis, melainkan **beban moderasi**. Karena itu: fitur ini **dibangun, tapi dengan pagar** (§14.4).

**Rekomendasi:** tetap lakukan, tetapi (1) **jangan "copy persis" Instagram**, adaptasi ke konteks desa (alasan §14.2); (2) **rilis setelah slice Surat stabil** (v2.1, ±4–5 minggu setelah MVP) agar fokus awal tetap pada urusan yang membuat desa mau membayar; (3) mulai dengan **pra-moderasi** di desa pilot.

### 14.2 Apa yang diambil dan diubah dari Instagram

| Elemen Instagram | Di Klandesa | Alasan |
|------------------|-------------|--------|
| Posting foto (carousel) + caption | **Ya** — 1–4 foto + teks (maks ±1.000 karakter) | Inti permintaan |
| Posting teks saja | **Ya** (latar warna opsional, gaya status) | Tidak semua warga punya foto |
| Video unggah | **Tidak** (biaya storage/bandwidth/moderasi) | Sesuai permintaan |
| Video dari platform lain | **Ya** — tempel satu tautan YouTube, TikTok, Facebook, atau X → kartu pratinjau (YouTube: thumbnail + judul; lainnya: ubin berlogo + judul bila tersedia); diputar di aplikasi aslinya (`Linking`), bukan di dalam app | Murah, tanpa WebView; konten di balik tautan dimoderasi platform asalnya, bukan desa |
| Like | **Ya** (♥, hitungan) | Umpan balik ringan |
| Komentar | **Ya** — datar (1 tingkat), balas dengan @nama; maks 500 karakter | Thread bersarang membingungkan |
| Follow akun | **Tidak** — semua warga desa otomatis satu "lingkaran" | Di desa semua saling kenal; follow = beban |
| Feed algoritmik | **Ya, bertahap (2026-10-29)** — tab "Untuk Anda" + "Terbaru" (urut waktu); postingan resmi desa tetap disematkan; aktif otomatis hanya di desa yang cukup ramai | Dibalik atas permintaan pemilik; risiko gelembung/keadilan ditangani pagar di `docs/SOCIAL_FEED_RANKING.md` |
| Stories/Reels/DM/live | **Tidak** (v2) | Di luar kemampuan moderasi |
| Hashtag | Ya, sederhana (#gotongroyong); tanpa halaman tren | Memudahkan cari kegiatan |
| Explore | **Filter**: Semua · RT saya · Kegiatan · Usaha · Foto | Pengganti explore, cocok skala desa |
| Bagikan | **Bagikan ke WhatsApp** (gambar + tautan) | Pintu pertumbuhan: WA → app |
| Simpan (bookmark) | Ya | Murah |
| Profil | Nama, foto, RT, lencana peran (Warga • RT • Perangkat Desa • Akun Resmi Desa) | Kepercayaan; menandai sumber resmi vs warga |

### 14.3 Alur & layar

**Tab Warga**
```
┌─────────────────────────────────┐
│ Warga Desa Sukamaju       🔍    │
│ [Semua][RT saya][Kegiatan][Usaha]│
│ ┌ 📌 Pemdes Sukamaju  ✓Resmi    ┐│  ← sematan akun resmi desa
│ │ Kerja bakti Minggu 07.00       ││
│ └───────────────────────────────┘│
│ ┌ (foto) Bu Siti · RT 03 · 2 jam ┐│
│ │ [ foto panen cabai ]  ●○○      ││
│ │ Alhamdulillah panen kali ini…  ││
│ │ ♥ 24   💬 6   ↗ Bagikan   ⚑    ││
│ └───────────────────────────────┘│
│                             (＋)  │  ← tombol Buat Postingan
└─────────────────────────────────┘
```
**Buat postingan (≤3 layar):** (1) pilih foto dari galeri/kamera (opsional, maks 4, dikompres otomatis) atau [Tempel tautan YouTube] atau langsung tulis → (2) tulis keterangan, pilih kategori (Kegiatan/Usaha/Info/Lainnya), tag RT otomatis → (3) pratinjau + [Bagikan ke Warga]. Pesan setelah kirim: pra-moderasi → *"Terkirim. Postingan Anda akan tampil setelah dicek perangkat desa (biasanya < 1 jam)."*; pasca-moderasi → langsung tampil.

**Detail postingan:** foto penuh (zoom), teks lengkap, komentar, ♥, bagikan, menu ⋯ (Laporkan · Sembunyikan · Blokir akun · [pemilik] Hapus/Edit dalam 15 menit).

**Notifikasi sosial:** digabung/ringkas ("Bu Siti dan 5 orang lain menyukai fotomu"), maks 1 push per postingan per jam, bisa dimatikan terpisah dari notifikasi Surat/Laporan (pagar agar notifikasi penting tidak tenggelam).

### 14.4 Pagar keamanan & moderasi (wajib; juga syarat Google Play untuk UGC)

**Wajib di app (kebijakan Play Store):** syarat & ketentuan UGC yang disetujui saat pertama masuk tab Warga; tombol **Laporkan** pada setiap postingan/komentar/profil; **Blokir** akun; hapus konten sendiri; mekanisme moderasi yang berjalan dan tanggapan atas laporan; kemampuan menghapus akun beserta kontennya.

**Akses & batasan:**
- Hanya **warga terverifikasi** desa itu yang bisa melihat & memposting (feed tertutup per desa — bukan publik). Akun baru: kuota 3 posting/hari pada 7 hari pertama.
- Aturan komunitas ringkas (6 poin, bahasa awam) dan sanksi bertahap (peringatan → bisukan 7 hari → blokir).
- Larangan: SARA, politik praktis/kampanye, hoaks, ujaran kebencian/fitnah/doxing, SARA, pornografi, judi/pinjol, penipuan, jual-beli barang terlarang, dan **foto anak tanpa izin orang tua** (peringatan saat mengunggah foto yang terdeteksi wajah anak bila nanti ada deteksi; v2.1 sekadar pengingat teks).
- Usia: pembuatan akun mengikuti data `Resident` (anak di bawah umur tidak punya akun sendiri; mereka dikelola lewat KK). Perlu **dicek ke konsultan hukum** soal regulasi perlindungan data & anak di platform digital terbaru sebelum rilis.

**Lapisan moderasi:**
1. *Otomatis (murah):* filter kata terlarang (daftar yang bisa diatur admin), tolak tautan selain YouTube/TikTok/Facebook/X (hostname harus persis, maksimal satu tautan per postingan), batas laju, deteksi duplikat; opsional nanti: klasifikasi gambar NSFW via layanan murah (dievaluasi biaya).
2. *Komunitas:* ≥3 laporan unik → konten disembunyikan sementara menunggu admin.
3. *Admin desa (web):* antrean moderasi (pra/pasca), sematkan, hapus, bisukan/blokir warga, lihat riwayat laporan. Pengaturan per desa: **mati / pasca-moderasi / pra-moderasi**, tentukan siapa saja moderator (Sekdes, staf, ketua RT untuk RT-nya).
4. *Platform (Klandesa):* log audit, takedown atas permintaan hukum, template aturan komunitas & SOP moderasi untuk desa.

**Tanggung jawab:** desa adalah pengelola ruang komunitasnya; Klandesa menyediakan alat. Perlu klausul di syarat layanan desa-Klandesa dan SOP singkat untuk admin (1 halaman). Posisikan fitur sebagai **add-on "Warga" yang bisa dimatikan desa** — desa yang belum siap moderasi tidak dipaksa.

### 14.5 Teknis (ringkas; detail masuk `MOBILE_V2_PLAN.md`)
- Model baru (aditif): `SocialPost`, `SocialPostMedia`, `SocialComment`, `SocialLike`, `SocialBookmark`, `SocialReport`, `SocialBlock`, `SocialModerationAction`, `VillageSocialSettings`. `ForumThread/ForumReply` yang ada **tidak dipakai ulang** (dibuat oleh `User` staf, teks saja, tanpa media/moderasi warga).
- Gambar: kompres di klien (maks sisi panjang 1080px, WebP/JPEG ~70%, target ≤300 KB), unggah langsung ke S3 lewat presign (sudah ada polanya), thumbnail 480px dibuat server; CDN/cache + `expo-image` untuk cache disk. Estimasi: 100 foto/hari/desa × 300 KB ≈ 30 MB/hari ≈ 11 GB/tahun/desa → perlu kuota penyimpanan per desa & kebijakan retensi (mis. foto >2 tahun diarsipkan).
- Tautan sematan: validasi URL per penyedia (`parseEmbedLink` di `lib/mobile/social-logic.ts`; hostname harus persis di daftar, https, tanpa kredensial/port, parameter pelacak dibuang). Judul diambil best-effort lewat oEmbed ke host tetap (YouTube, TikTok, X; Facebook tanpa oEmbed publik sehingga tanpa judul). Disimpan `linkProvider` + `linkUrl` + `linkTitle` (YouTube juga mengisi kolom lama `youtubeId`). Thumbnail hanya untuk YouTube (diturunkan dari ID); thumbnail TikTok kedaluwarsa sehingga tidak disimpan. Pemutaran: buka aplikasi/peramban penyedia. Tidak mengunduh/menyimpan video.
- Feed: paginasi kursor, cache SQLite untuk 20 postingan terakhir, optimistic like/komentar, antrean offline untuk posting.
- Biaya mengikuti paket: add-on `warga_sosial` di `lib/modules/entitlements.ts`.
- Pengukuran: DAU/MAU tab Warga, % warga yang pernah posting (target 10–15%), rasio laporan/postingan (<2%), waktu median penyelesaian laporan moderasi (<24 jam), % desa yang mengaktifkan.

### 14.6 Pertanyaan keputusan untuk Anda
1. **Waktu rilis:** v2.1 setelah Surat stabil (rekomendasi), atau ikut di v2.0? Mengikutkan di v2.0 menambah ±4–5 minggu dan risiko moderasi sebelum desa terbiasa dengan app.
2. **Mode awal desa pilot:** pra-moderasi (aman, perlu admin aktif) atau pasca-moderasi + laporan warga?
3. **Siapa moderator:** hanya perangkat desa, atau juga ketua RT per RT?
4. **Tampil publik?** Rekomendasi: feed hanya untuk warga desa itu. Apakah ada kebutuhan agar postingan tertentu (mis. usaha) bisa terlihat di website desa?
5. **Akun resmi desa:** postingan Pemdes tampil sebagai akun resmi bercentang (sematan), terpisah dari "Kabar Desa"? Rekomendasi: gabungkan — Kabar Desa = postingan akun resmi, tampil juga di Beranda.
