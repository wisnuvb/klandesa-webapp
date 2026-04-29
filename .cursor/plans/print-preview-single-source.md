# Print preview + konsistensi (single source of truth)

## Konteks singkat masalah cetak/preview

- **Nomor tidak lengkap:** `replaceVariables(format)` butuh data `TAHUN`, `BULAN_ROMAWI` (sering kosong di `buildPreviewData`).
- **Jarak vertikal:** `renderLetterNumber` (`mb-6`, `space-y`, margin `h1`) dan kop surat [`renderHeader`](utils/templateRenderer.tsx) terlalu renggang.
- **Font di print:** [`printPreview`](app/(app)/layanan-surat/_hooks/useLetterExport.ts) perlu font termuat dan stylesheet konsisten.

## Prinsip baru: satu sumber kebenaran (single source of truth)

Hindari menyalin atau menduplikasi logika yang sama di banyak file. Sasaran konsistensi antara **preview**, **cetak/PDF**, **builder preview nomor**, dan **form surat**.

### Domain yang akan dipusatkan

| Domain | Sasaran konsolidasi | Catatan |
|--------|---------------------|--------|
| **Variabel tanggal untuk nomor** | Satu helper (mis. `deriveSuratDateMeta(formData)` → `TAHUN`, `BULAN_ROMAWI`) dipanggil dari **satu** tempat seperti [`buildPreviewData`](app/(app)/layanan-surat/_utils/letterPreview.tsx). Builder/preview nomor yang sudah punya [`buildLetterNumberPreviewVariableData`](components/template-builder/letter-number-utils.ts) tetap dipakai untuk tab builder; **preview surat** memakai helper yang sama atau thin wrapper agar tidak ada dua definisi roman month/tahun. |
| **Render blok kop + nomor** | Tetap pusat di [`templateRenderer.tsx`](utils/templateRenderer.tsx); penyesuaian spacing hanya di sini. |
| **Data gabungan preview** | [`buildPreviewData`](app/(app)/layanan-surat/_utils/letterPreview.tsx) + [`getTemplatePreviewData`](app/(app)/layanan-surat/_utils/letterPreview.tsx): setelah tanggal/meta terpusat, pastikan kedua jalur menghormati satu fungsi gabungan atau memanggil helper meta yang sama. |
| **Cetak/PDF** | [`useLetterExport`](app/(app)/layanan-surat/_hooks/useLetterExport.ts): ekstraksi ke modul kecil **`printSuratChrome.ts`** atau serupa untuk “siapkan jendela print + stylesheet + fonts.ready” — satu lokasi untuk aturan cetak (boleh dipanggil dari semua tombol cetak riwayat/preview/dialog). |

### Struktur file yang diusulkan (implementasi konkret)

- **`lib/mail/suratDateVariables.ts`** (atah nama setara): `parseLetterDateFromFormData()`, `suratDateMetaForPreview(data): { tahun, bulanRomawi }` — dipakai oleh `buildPreviewData` dan tidak mengulang logika di `letterCreateUtils` kecuali re-export `parseIndonesianLetterDateString`.
- **Atau** perluas [`letterCreateUtils.ts`](app/(app)/layanan-surat/_utils/letterCreateUtils.ts) dengan `appendSuratDateVariablesForTemplate(data)` jika ingin minim file baru; prinsipnya **satu fungsi** dipanggil dari `buildPreviewData` saja.
- **Refactor ringan:** evaluasi apakah [`buildLetterNumberPreviewVariableData`](components/template-builder/letter-number-utils.ts) dan helper meta surat bisa berbagi `getRomanMonth` + aturan fallback tanggal (tanpa duplikasi).

### Yang tidak perlu dipaksa jadi satu modul

- UI murni (Dialog vs Tab) — tetap terpisah; yang disatukan adalah **data** dan **aturan replace/render**.

## Tugas implementasi (urutan)

1. **Helper meta tanggal (single source)** — implementasi + panggil dari `buildPreviewData`.
2. **Spacing** — `renderLetterNumber` + `renderHeader` di `templateRenderer.tsx`.
3. **Print** — `useLetterExport` (font + tunggu load); pertimbangkan ekstrak fungsi print ke modul terpisah.
4. **Alihkan duplikat** — jika ada pemanggilan serupa di tempat lain, ganti ke helper yang sama.
5. Uji: nomor lengkap, jarak, font print/PDF.

## Daftar todo

- [ ] **meta-tahun-bulan-ssot**: Satu helper `suratDateMeta` + integrasi di `buildPreviewData`.
- [ ] **spacing-letter-number-header**: Sesuaikan `renderLetterNumber` dan `renderHeader`.
- [ ] **print-fonts-consolidated**: Perkuat jendela cetak (fonts + stylesheet) di satu modul/fungsi yang reusable.
- [ ] **dedupe-letter-number-preview**: Selaraskan dengan `letter-number-utils` bila ada overlap.
