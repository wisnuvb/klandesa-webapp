# Paket 8: Permohonan Warga (antrean kerja + AI)

Tanggal: 2026-11-02. Status: **dikode dan teruji lokal (476 tes terkait lulus, kueri diuji ke MySQL lokal); SQL sudah dijalankan di DB dev, BELUM di produksi; belum diuji di peramban (tidak ada kredensial login).**
Asal: audit halaman `/permohonan-warga` (dialog detail kosong sejak Jan 2026, statistik dari 10 baris halaman aktif, `PUT` tidak aman, AI belum terhubung).

## Penerapan SQL (WAJIB sebelum kode)

`PHASE8_PERMOHONAN_MIGRATION.sql` (+`_ROLLBACK.sql`): 1 kolom NULL `mail_requests.mailServiceId` + 1 indeks. Aditif. Prisma Client baru memilih kolom ini di SEMUA kueri `MailRequest` (termasuk API mobile), jadi bila kode dirilis sebelum SQL, permohonan surat di produksi (web + mobile) galat P2022. Urutan: SQL → kode, sesuai `memory/prod-deploy-procedure`.

## Fase 1: dasar

- `lib/mail/request-queue.ts`: penyaring (status, antrean siap/menunggu RT/ditolak RT/lama, jenis, saluran, RT, tanggal, urutan), statistik dari seluruh data, pemeriksaan server per baris (`evaluateMailRequest` milik Laras + tanda "sering mengajukan" ≥3 dalam 7 hari). `pageSize` dibatasi 50.
- `lib/mail/request-decision.ts`: keputusan web memakai update bersyarat (sama dengan mobile/Laras). `PUT /api/mail-requests` tidak lagi bisa memutus ulang, melewati Ketua RT, atau menolak tanpa alasan (min. 5 huruf). Status "DIPROSES" dihapus dari UI (tidak pernah ada di DB). Pengecualian disengaja: permohonan yang DITOLAK Ketua RT boleh ditutup dengan penolakan (di mobile/Laras ia menggantung selamanya), tetapi tidak boleh disetujui.
- `GET /api/mail-requests/[id]`: rincian + data warga + riwayat pemohon + surat terbit. Ekspor memakai penyaring yang sama, dibatasi 10.000 baris.
- UI dipecah di `components/app/permohonan-warga/`. NIK tampil penuh (keputusan pemilik).

## Fase 2: AI per permohonan

- `POST /api/mail-requests/[id]/assist`: ringkasan, uji kecocokan jenis surat↔keperluan, hal yang perlu dipastikan, draf catatan setuju / alasan tolak / pesan ke warga. 1 kredit AI (`reserveAiCredit`, dikembalikan bila gagal), cache 10 menit per permohonan (kunci memuat `updatedAt`).
- Privasi: model TIDAK menerima nama, NIK, telepon, alamat. Teks keperluan = tak tepercaya (disamarkan, dipotong, ditandai). Keluaran divalidasi zod dan disaring (`cleanOutbound`: tautan dibuang, NIK/telepon disamarkan). "Setujui" diturunkan menjadi "periksa manual" bila server menemukan masalah data pemohon.
- `POST /api/mail-requests/nl-filter`: kalimat biasa → filter (daftar putih; jenis surat harus ada di desa). 1 kredit.

## Fase 3: lanjutan

- **Proses Cerdas** (`POST /api/mail-requests/smart-process`, `lib/mail/request-smart.ts`): hingga 10 permohonan tertua yang siap; hanya yang BERSIH dari peringatan dinilai AI (1 panggilan, 1 kredit); yang "cocok" menjadi usulan setuju (kartu HMAC yang sama dengan Laras, konfirmasi lewat `/api/ai/actions/confirm`). Sengaja berbeda dari kartu Laras yang `batchable: false`: staf melihat keperluan + alasan AI per baris, pilihan awal KOSONG, ada dialog konfirmasi jumlah.
- **Setujui & terbitkan surat**: `/layanan-surat/buat?templateId=…&permohonan=ID` mengisi pemohon + keperluan otomatis; saat surat terbit (`POST /api/letters` atau `PATCH /api/letters/[id]` dengan `permohonanId`), `linkIssuedLetter` menyetujui permohonan dan mengisi `mailServiceId` (hanya bila NIK surat = NIK pemohon). `findIssuedLetter` (unduhan mobile) mendahulukan tautan eksplisit.
- Deteksi anomali: tanda "sering mengajukan" (deterministik, tanpa LLM).

## Belum / keterbatasan

- Draf surat yang dibuka ulang dari daftar (`?surat=ID` tanpa `permohonan`) kehilangan tautan; penghubung lama (NIK + templat + tanggal) tetap berlaku.
- Wawasan lanjutan (lonjakan per jenis, perkiraan beban) belum dibuat; statistik dasar + 5 jenis teratas sudah tersedia di API (`topPending`) tetapi belum ditampilkan.
- Belum diuji di peramban dan belum dengan model asli (tes memakai model palsu). Setelah deploy pantau log `mail-ai upstream error`.
- Kredit AI dibebankan ke pengguna yang menekan (sistem kredit yang ada), bukan saldo desa terpisah.
