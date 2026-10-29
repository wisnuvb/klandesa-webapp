# Rencana: Pembuatan Surat Sederhana & Kanvas Template

Status: **Fase 0 selesai, fondasi Fase 1 selesai (modul + tes), belum tersambung ke UI.**
Diperbarui: 2026-10-29.

## Tujuan

Perangkat desa (termasuk operator awam) dapat membuat surat dan mengubah tata letaknya langsung di kertas (kanvas), tanpa memahami konsep "template", "variabel", atau "blok". Layout dikendalikan penuh oleh desa. Data yang terhubung ke database (warga, desa, pejabat) tersedia lewat pilihan sederhana. Performa dan keamanan menjadi syarat sejak awal.

## Keputusan

| Keputusan | Pilihan |
|---|---|
| Teks kaya di dalam bagian | Tiptap (belum dipasang; Fase 3) |
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

### Fase 1 — Fondasi data (modul selesai, belum tersambung ke UI)

- [x] `lib/letters/format.ts`: terbilang, tanggal/hari Indonesia, rupiah, huruf kapital.
- [x] `lib/letters/paper.ts`: F4/A4/Letter/Legal, margin, font, area tulis.
- [x] `lib/letters/numbering.ts`: pola nomor bertoken, penghitung (`counterScopeKey`).
- [x] `lib/letters/registry.ts`: isian orang/desa/pejabat/surat, allowlist kolom `Resident` (`RESIDENT_SELECT`), `residentToPerson`.
- [x] `lib/letters/document/schema.ts`: skema dokumen v2 (zod), batas ukuran, gambar hanya path relatif/https.
- [x] `lib/letters/document/validate.ts`: validasi lintas-rujukan (peran, isian, grup, ID unik).
- [x] `lib/letters/document/form-spec.ts`: form turun otomatis dari kanvas; `lintDocument` ("Cek surat").
- [x] Fixture pola lapangan + 47 tes (`tests/letters.test.ts`).
- [ ] Profil Tata Naskah Desa (kop, kertas, font, pejabat, penomoran bawaan) disimpan di `Village.settings`.
- [ ] Penghitung nomor atomik di server (tabel/kolom penghitung; perlu migrasi DB).
- [ ] `applicantName`/`applicantNik` opsional untuk surat internal (perlu migrasi DB).
- [ ] Katalog 19 template ditulis ulang ke format v2 + `prisma/seed.ts`.
- [ ] Penyesuaian konsumen: `mail-services`, `mobile/v1/mail/*`, `lib/ai/village-assistant.ts`.

### Fase 2 — Alur membuat surat

Layar terbagi: kiri hanya isian yang belum otomatis, kanan kertas hidup; klik chip di kertas untuk mengisi di tempat. Satu tombol utama "Simpan & Cetak". Riwayat dengan paginasi + endpoint detail. Render surat di server (`contentHtml`/PDF).

### Fase 3 — Kanvas template

Satu halaman penuh, edit langsung di kertas, sisip lewat `+` atau `/`, isian sebagai chip, drag-and-drop dengan alternatif keyboard, atur halaman (F4 bawaan), undo/redo, autosave, riwayat versi, "Cek surat". Hapus builder lama (~7.100 baris).

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
