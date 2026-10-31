# Fase 1 butir 4 (sisa): Produk Hukum, Register Surat, Lembaga Desa

Status: dikode 2026-11-01; belum diuji di browser; SQL produksi belum diterapkan.

Tiga modul kecil, semuanya register (bukan penyimpan berkas), tanpa dependensi baru.

| Modul | Layar | API | Tabel |
|---|---|---|---|
| Produk Hukum Desa | `/produk-hukum` | `/api/tata-kelola/produk-hukum` (+`/[id]`, `/[id]/pencabutan`) | `legal_documents` |
| Register Surat | `/register-surat` | `/api/tata-kelola/surat` (+`/[id]`) | `mail_register` |
| Lembaga Desa | `/lembaga-desa` | `/api/tata-kelola/lembaga` (+`/[id]`, `/[id]/anggota[/memberId]`) | `village_institutions`, `institution_members` |

SQL aditif: `PHASE1_TATAKELOLA_MIGRATION.sql` (rollback `..._ROLLBACK.sql`). Kode: `lib/tata-kelola/{catalog,legal,register,institutions,http}.ts`, pembantu bersama `lib/form-input.ts`, `hooks/useFormSubmit.ts`, `components/app/FormErrorSummary.tsx`.

## Aturan yang dipegang
- **Produk hukum**: jenis Perdes, Perkades, Peraturan Bersama, Keputusan Kepala Desa, lainnya. Nomor unik per desa+jenis+tahun (tahun diturunkan dari tanggal ditetapkan). Diundangkan/disampaikan tak boleh sebelum ditetapkan atau di masa depan. **Dicabut** = status satu arah dengan tanggal dan dasar pencabutan; tak bisa diberlakukan lagi. Hapus hanya untuk salah catat.
- **Register surat**: nomor agenda berurutan per desa+arah+tahun, dialokasikan dengan indeks unik + coba ulang (aman dari pencatat serentak; teruji 6 serentak = 6 nomor berbeda). **Tidak ada hapus** (buku agenda tak boleh berlubang); arah dan tahun tak berubah saat ubah. Kepala desa boleh mengubah (disposisi) tetapi tidak mencatat baru.
- **Lembaga**: anggota boleh dari data warga (nama diambil dari sana, warga desa lain ditolak) atau diketik. Anggota yang sudah berakhir tetap tampil sebagai riwayat; lembaga yang masa jabatannya lewat diberi peringatan. Menghapus warga tidak menghapus anggota (nama tersimpan).
- Tanpa data pribadi sensitif (tak ada NIK/telepon anggota).
- Izin: resource `produk_hukum`, `register_surat`, `lembaga_desa`. Mencabut produk hukum butuh `update` (dicek dalam rute karena POST).

## Sengaja tidak diklaim
Batas waktu hukum (mis. tenggat penyampaian Perdes ke Bupati, lama masa jabatan BPD, jenis Perdes yang wajib dievaluasi) **tidak** ditanamkan karena belum diverifikasi dari teks resmi terbaru (UU 3/2024 mengubah beberapa masa jabatan). Layar hanya mencatat tanggal.

## Belum
Lampiran berkas (tautan ke Arsip Digital; pemilih Arsip saat ini khusus gambar), cetak buku agenda, surat keluar otomatis dari Layanan Surat, pencarian lintas modul, pengingat masa jabatan lewat notifikasi, keanggotaan lembaga per periode (riwayat penuh), ekspor.

## Rilis
SQL ini menjadi berkas ketujuh untuk rilis produksi tunggal (jangan `db push`). Tes: `tests/tata-kelola.test.ts`, `tests/tata-kelola.integration.test.ts`.
