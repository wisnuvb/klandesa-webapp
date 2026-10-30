# Rencana: Pembuatan Surat Sederhana & Kanvas Template

Status: **Fase 0, 1, 2 selesai. Fase 3 (editor kanvas) terbangun, terhubung ke halaman Layanan Surat, dan lolos uji asap Chromium (harness tanpa auth); belum diuji di AppShell dengan login dan DB nyata.**
Diperbarui: 2026-10-29.

## Tujuan

Perangkat desa (termasuk operator awam) dapat membuat surat dan mengubah tata letaknya langsung di kertas (kanvas), tanpa memahami konsep "template", "variabel", atau "blok". Layout dikendalikan penuh oleh desa. Data yang terhubung ke database (warga, desa, pejabat) tersedia lewat pilihan sederhana. Performa dan keamanan menjadi syarat sejak awal.

## Keputusan

| Keputusan | Pilihan |
|---|---|
| Teks kaya di dalam bagian | Tiptap (terpasang; hanya bold/italic/underline/hardBreak + node isian) |
| Drag-and-drop | dnd-kit, dengan alternatif tombol & keyboard (WCAG 2.2) |
| Migrasi template lama | **Tidak ada.** Versi ini belum dipakai desa; skema v2 menggantikan langsung |
| Cetak | CSS `@page` (F4 bawaan) lebih dulu; PDF server-side bila perlu |
| Kertas bawaan | **F4/Folio 215×330 mm** (acuan Perbup tata naskah desa), A4/Letter/Legal pilihan |
| Dokumen | JSON berversi (`schemaVersion: 2`) di `MailTemplate.templateStructure`; tanpa HTML/skrip |

## Temuan audit (kondisi awal)

Alur: Katalog → "Sesuaikan" (fork tersembunyi) → builder 6 tab → simpan → gunakan → dialog form → simpan/cetak. Builder berbasis form, bukan kanvas; ikon drag hanya hiasan; sekitar 7.100 baris kode builder dan library yang duplikat. Variabel diketik manual `{KEY}`, daftar di-hardcode, alias lama ditambal.

Keamanan & performa yang ditemukan (status di bawah):

1. `templateStructure`/`contentTemplate` disimpan tanpa validasi/batas ukuran.
2. Hapus template ikut menghapus semua surat (arsip resmi).
3. `mail-services` POST mencari template hanya dengan `id` (lintas desa).
4. `contentHtml` dari klien disimpan mentah, lalu disajikan ke warga.
5. `formData` tanpa batas jumlah key / panjang value; `err.message` bocor ke klien.
6. XSS tersimpan: `generateLetterPreviewHtml` memasukkan isian ke `dangerouslySetInnerHTML` tanpa escape.
7. Daftar surat tanpa paginasi, membawa `templateStructure` lengkap di tiap baris.
8. `replaceVariables`: `split/join` per key per render; `{{KEY}}` menyisakan kurung.
9. Kertas dikunci A4 (`210×297`, `jsPDF("a4")`).

## Pola lapangan yang harus bisa disusun

Sumber: Perbup Bangka 60/2020 (dibaca langsung) dan potongan Perbup/dokumen daerah lain. **Tidak ada standar nasional tunggal**; format berbeda per kabupaten. Kolom persis formulir N1–N7 tidak terverifikasi. Lihat `tests/letters-fixtures.ts` untuk contoh yang dijadikan acuan penerimaan.

| Pola | Kemampuan |
|---|---|
| Anatomi berbeda (keterangan, surat biasa, perintah, keputusan, berita acara) | tipe dokumen + blok `title`, `memo`, `dictum`, `cc` |
| Data berulang (ahli waris, saksi, anggota keluarga, daftar hadir) | `groups` + blok `repeatTable` |
| Banyak orang berperan (pemohon, almarhum, pihak 1/2, saksi, ortu) | `people` (peran) + `personData` |
| Penandatangan beragam (a.n./Plt/Pj, Mengetahui, pemohon bermaterai, saksi, stempel) | blok `signature` dengan slot bebas |
| Surat internal tanpa pemohon | `audience: "internal"` |
| Kertas F4, font Arial/Bookman, spasi 1–1,5 | `page` |
| Penomoran berbeda per kabupaten | `numbering` (pola bertoken, penghitung bersama) |
| Kop berbeda (desa / garuda / tanpa) | `letterhead` |
| Lampiran & multi-lembar | `pageBreak` + blok biasa |
| Nominal + terbilang, tanggal Indonesia | formatter `rupiah`, `terbilang_rupiah`, `tanggal`, … |
| Bagian bersyarat | blok `conditional` (operator terbatas, bukan skrip) |
| Data sensitif (penyebab kematian) | `sensitive` pada isian |
| Satu permohonan → banyak surat (paket nikah N1–N7) | **Belum**; Fase 4 (paket surat) |

## Kemajuan

### Fase 0 — Perbaikan keamanan (selesai)

- [x] `lib/http/read-json.ts`: baca body JSON dengan batas ukuran (cek `Content-Length` dan panjang sebenarnya).
- [x] `lib/mail/template-guard.ts`: batas ukuran, kedalaman, jumlah node, panjang string, kunci berbahaya; nama/kategori/deskripsi dirapikan. Dokumen v2 divalidasi penuh.
- [x] `lib/mail/letter-input.ts`: `formData` datar dengan kunci/ukuran berbatas; status, tanggal, peran penandatangan, nomor surat divalidasi.
- [x] `lib/mail/template-access.ts`: template hanya milik desa sendiri atau katalog global.
- [x] `mail-templates` POST/PATCH memakai validator; GET memakai cakupan tenant.
- [x] `mail-services` POST/PATCH: validasi input, cakupan tenant, status/tanggal valid, `contentHtml` dari klien tidak diterima, pesan error generik.
- [x] Hapus template: diarsipkan (`isActive=false`) bila sudah dipakai surat; surat tidak pernah ikut terhapus. Teks konfirmasi UI diperbarui.
- [x] XSS tersimpan di jalur HTML lama ditutup (`lib/html-escape.ts`).
- [x] `replaceVariables` satu lintasan (`lib/letters/fill.ts`).
- [ ] Paginasi + endpoint detail untuk riwayat surat (butuh perubahan `LetterHistoryTab`; dikerjakan di Fase 2).
- [ ] Pemisahan izin `template.manage` / `letter.create` (saat ini keduanya resource `mail`, lihat `lib/permissions/api-route-map.ts`).
- [ ] Audit log perubahan template.

**Dampak yang perlu diketahui:** rute unduh surat mobile (`/api/mobile/v1/mail/requests/[id]/document`) membaca `contentHtml`. Karena klien tidak lagi bisa mengisinya (tidak ada penulis lain di kode), unduhan itu akan 404 sampai surat dirender di server (Fase 2/4).

### Fase 1 — Fondasi data (selesai)

- [x] `lib/letters/format.ts`, `paper.ts`, `numbering.ts`, `registry.ts` (allowlist kolom `Resident`), `values.ts` (penyelesai rujukan).
- [x] `lib/letters/document/{schema,validate,form-spec}.ts`: skema dokumen v2 (zod), validasi lintas-rujukan, form turun otomatis, "Cek surat".
- [x] Fixture pola lapangan + tes.
- [x] Katalog 19 template ditulis ulang ke v2 (`lib/letters/catalog/*`, `lib/mail/catalogTemplates.ts`) + `scripts/sync-letter-catalog.ts`.
- [x] Katalog diperluas menjadi 37 template (2026-10-30) dalam 4 kategori: Keterangan 16, Pengantar 8, Kependudukan 5, **Administrasi Desa 8** (surat dinas internal tanpa pemohon: undangan, tugas, edaran, pemberitahuan, SK Kepala Desa, berita acara, daftar hadir, nota dinas; `lib/letters/catalog/administrasi.ts`). Daftar ini disusun dari pola surat desa yang lazim dan pola Perbup tata naskah yang sudah dibaca; **bukan daftar lengkap** dan formatnya berbeda per kabupaten, sehingga yang formatnya bervariasi diberi akhiran "(kerangka)". Kode klasifikasi arsip surat dinas diisi umum (`000`) dan dasar hukum SK Kepala Desa diisi operator; desa menyesuaikannya dengan aturan daerah. Setelah deploy jalankan `npx tsx scripts/sync-letter-catalog.ts` (kunci katalog lama tidak berubah).
- [x] Penghitung nomor atomik (`mail_number_counters`, `lib/letters/server/numbering.ts`), diuji 25 transaksi serentak di MySQL.
- [x] `applicantName`/`applicantNik` boleh kosong untuk surat internal (tanpa migrasi: kolom tetap NOT NULL, diisi `""`).
- [ ] Profil Tata Naskah Desa (kop, kertas, font, pejabat, penomoran bawaan) yang dapat diatur di UI. Sementara kop dibangun dari data desa dan pejabat yang sudah ada (`buildLetterContext`).
- [ ] Pengaturan "nomor terakhir" per buku agenda agar desa dapat melanjutkan penomoran lama.

### Fase 2 — Alur membuat surat (selesai)

Backend (diuji end-to-end terhadap MySQL sementara):
- [x] Migrasi `20261029150000_letters_v2_foundation` (aditif): tabel `mail_number_counters`, kolom `mail_services.templateSnapshot`, `contentHtml` → `MEDIUMTEXT`. Diverifikasi: setelah diterapkan, database identik dengan `schema.prisma`.
- [x] `POST/GET/PATCH/DELETE /api/letters`, `GET /api/letters/context`, `GET /api/letters/residents/[id]`, `GET /api/mail-templates/[id]`; terdaftar di peta izin (`resource: mail`; data warga juga wajib izin `residents`).
- [x] Nomor dialokasikan server saat **terbit** (draf tidak memakai nomor); surat terbit tidak bisa diubah, hanya diarsipkan; hanya draf yang bisa dibuang.
- [x] Dokumen dibekukan di surat (`templateSnapshot`); HTML dirender server dan disimpan (`contentHtml`), sehingga unduhan mobile berfungsi lagi.
- [x] Isolasi tenant: template, warga, dan surat desa lain ditolak.
- [x] Riwayat: daftar ringan (struktur template tidak diulang per baris, batas 500 baris), surat v2 dibuka lewat `GET /api/letters/[id]`.

Antarmuka:
- [x] Daftar template: v2 dibuat lewat halaman komposer `/layanan-surat/buat`; pratinjau jenis surat dengan data contoh.
- [x] Riwayat: lihat, cetak ulang (iframe terisolasi), lanjutkan draf, "buat surat sejenis".
- [x] Komposer layar terbagi (lihat bagian status di bawah bila belum selesai).
- [ ] Paginasi dan filter sisi server untuk riwayat.

**Catatan:** builder lama sudah dihapus (2026-10-30); semua jenis surat diubah lewat editor kanvas (Fase 3).

### Fase 3 — Kanvas template (terbangun; uji asap peramban lulus)

Halaman `/layanan-surat/editor` (`?templateId=` ubah, `?start=` mulai baru dari kosong/contoh, `?forkFromId=` salin template katalog lalu ubah). Entry point: "Ubah" (template v2), "Jenis Surat Baru" (dialog pilihan awal), "Sesuaikan" (katalog v2).

- [x] Inti editor murni dan teruji (`lib/letters/editor/*`): operasi blok (termasuk kolom/bersyarat), id, pemakaian peran/isian/daftar (hapus ditolak bila masih dipakai), 24 preset bagian, konversi inline↔Tiptap, riwayat undo/redo (batas 100, penggabungan ketikan), `useDocumentEditor`.
- [x] Persistensi (`editor/_hooks/useTemplateDocument`): autosave 1,5 dtk, backoff, konflik via `expectedUpdatedAt`, peringatan tutup tab, mulai dari contoh/kosong.
- [x] Kanvas edit-di-tempat (`components/letters/editor/canvas`): klik bagian → sunting di kertas, chip isian, `/` pemilih isian, `+` menu bagian, dnd-kit dengan alternatif tombol dan keyboard, hapus dengan "Urungkan", zoom kertas.
- [x] Panel samping (`components/letters/editor/panels`): Bagian + inspector, Orang & isian, Halaman + penomoran, Cek surat.
- [x] Tombol "Ubah" template v2 diaktifkan; "Jenis Surat Baru" memakai editor baru.
- [x] Uji asap Chromium via harness (teks, chip, sisip, drag/keyboard, panel, layar 390px, alur simpan dengan API palsu). Jeda ketik dev-mode: median 13 ms (5 bagian) / 23 ms (45 bagian), P90 78 ms.
- [ ] Uji pada halaman editor sungguhan (login, AppShell: posisi sticky/tinggi, simpan ke DB, RBAC/tenant).
- [x] Builder lama dihapus (2026-10-30): `components/template-builder`, dialog/hook form lama, renderer lama (~9.900 baris). Daftar hanya menampilkan format v2; surat lama di Riwayat hanya menampilkan isian tersimpan. Backend `/api/mail-services` & `lib/mail/letterFormSnapshot` belum dibersihkan (dipakai mobile/pengaturan desa).
- [ ] Riwayat versi template.

**Catatan UX dari uji peramban — sudah diperbaiki (2026-10-29):** bilah alat satu baris tinggi tetap; `+` dan pegangan seret pindah ke margin (hit area ≥44 px); zoom HP minimum 0,6.

**Struktur halaman (2026-10-29):** menu sidebar "Buat Surat" → `/layanan-surat` dengan tiga tab (URL `?tab=`): **Buat Surat** (pilih jenis surat, default), **Riwayat**, **Atur Jenis Surat** (dulu "Kelola Template"; kartu; Ubah/Sesuaikan/Jenis Surat Baru/Hapus). Tab terakhir dibuka diingat di localStorage (`layanan-surat:tab-terakhir`) dan dipulihkan bila URL tanpa `?tab=`. `/layanan-surat/buat` tanpa parameter menampilkan pemilih jenis surat yang sama. Uji E2E Chromium (DB sementara, login distub di salinan): daftar → komposer layar terbagi → draf → terbit → riwayat → cetak, ahli waris/saksi/internal, Sesuaikan → editor → autosave → pakai, konflik, isolasi desa: semua lulus.

**Batasan yang diketahui:** label baris memo/header tabel/tembusan hanya diubah di panel; tabel belum bisa tambah baris/kolom dari kertas; isian grup tidak bisa disisipkan sebagai chip; inspector `memo`, `signature`, `table` minimal; susunan tanda tangan "pemohon + saksi" hanya dari panel Sisipkan.

### Fase 4 — Pelengkap

Paket surat (N1–N7), impor dari Word, cetak/PDF F4, aksesibilitas, tampilan tablet/HP, onboarding, metrik.

## Prinsip UX kanvas untuk operator awam

1. Satu kertas, edit langsung; tanpa tab dan tanpa panel wajib.
2. Bahasa awam: "isian", "bagian", "orang yang disebut di surat".
3. Sisipkan dari satu tempat (`+` / `/`); isian baru dibuat langsung dari picker.
4. Bagian cerdas: "Data orang" tinggal mencentang field; "Tanda tangan" memilih preset.
5. Mulai dari contoh, bukan halaman kosong.
6. Jaring pengaman: undo/redo, autosave, riwayat, "Urungkan" setelah hapus.
7. "Cek surat": saran yang tidak menghalangi.
8. Bertahap: mode sederhana bawaan, panel lanjutan opsional.
9. Drag selalu punya alternatif tombol/keyboard; target sentuh ≥ 44 px; kontras ≥ 4,5:1.
10. Target jeda ketik < 100 ms (render per bagian di-memo; editor dimuat lazy).

## Batas riset

Hasil pencarian web tipis dan sebagian berupa templat tak resmi. Belum terverifikasi: kolom formulir N1–N7, aturan penomoran surat desa yang pasti, apakah ada surat sah tanpa nomor, cara OpenSID menangani template. Karena itu desain mengutamakan **operator dapat menambah sendiri** apa yang kurang, bukan daftar jenis surat yang dianggap lengkap.
