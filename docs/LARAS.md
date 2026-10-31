# Laras — asisten desa AI

Hasil audit & perbaikan 2026-10-31. Kode: `lib/ai/`, `app/api/ai/`, `app/(app)/asisten-ai/`.

## Alur satu pertanyaan

`POST /api/ai/village-assistant` → sesi desa + langganan + modul → rate limit (8/menit, 100/jam per pengguna, tabel
`mobile_rate_limits`) → cek kredit → **redaksi NIK/telepon pada pesan** → konteks ringkas desa → `runLarasChat`
(model ↔ tool, maks. 3 putaran, 1500 token) → bersihkan jawaban (gambar dibuang, NIK disamarkan) → simpan pesan +
jawaban dalam satu transaksi → `AuditLog` (`ai_query`: mode, nama tool, jumlah redaksi; **bukan isi pesan**).
Kredit dipesan sebelum model dipanggil dan dikembalikan bila apa pun gagal sebelum jawaban tersimpan.

## Tool data (baca-saja, `lib/ai/laras-tools.ts`)

| Tool | Izin (`read`) | Modul |
|---|---|---|
| `population_stats` | residents | data-warga |
| `finance_summary` | finance | keuangan |
| `mail_requests_summary` | mail | layanan-surat |
| `citizen_reports_summary` | citizen_reports | pengaduan-masyarakat |
| `social_benefits_summary` | social_benefits | bantuan-program-keluarga |

Aturan yang tidak boleh dilanggar saat menambah tool:

1. `villageId` dari konteks server, bukan argumen model.
2. Cek izin `read` milik **pengguna yang bertanya** dan entitlement modul (dilakukan `executeLarasTool`).
3. Hanya agregat. Jangan `select` kolom identitas (nik, kk, name, address, phone, email, nama orang tua).
4. Hitungan 1–4 disamarkan (`<5`) lewat `lib/ai/laras-aggregate.ts` / `suppressSmallCount`.
5. Tool hanya membaca. Aksi tulis, bila kelak ada, berupa usulan yang dikonfirmasi pengguna.
6. Tambahkan tes di `tests/laras-*.test.ts`.

## Aksi: Laras mengusulkan, manusia mengonfirmasi

Entry point kerja desa lewat Laras. Saat ini: **memproses permohonan surat**, **menindaklanjuti pengaduan warga**, dan **menerbitkan pengumuman**.

1. `mail_requests_pending` (izin mail:read) — daftar permohonan menunggu + hasil pemeriksaan server (siap/hambatan/peringatan).
   **Tanpa nama/NIK pemohon**; teks "keperluan" dari warga ditandai tak tepercaya, disamarkan, dipotong.
2. `propose_mail_decision` (izin **mail:update**) — hanya membuat *usulan*: token bertanda tangan HMAC
   (`lib/ai/laras-actions.ts`, berlaku 15 menit, terikat userId + villageId). Tidak ada yang berubah di database.
   Server menolak usulan untuk permohonan yang sudah diproses atau menunggu Ketua RT. Maks. 10 usulan per pertanyaan.
3. Kartu di chat (`components/ai/LarasActionCards.tsx`) → `POST /api/ai/actions/confirm`: verifikasi tanda tangan, cek
   pemilik token, **cek ulang izin dan modul memakai role SEGAR dari DB** (`lib/ai/laras-authz.ts`; role di JWT bisa basi sampai
   30 hari), token **sekali pakai** (`lib/ai/laras-token-store.ts`), lalu update bersyarat yang sama dengan jalur staf mobile,
   `AuditLog` (`metadata.via = "laras"`) dan notifikasi ke warga (`lib/ai/laras-mail.ts`).

### Pengaduan warga (`lib/ai/laras-report.ts`)

- `citizen_reports_open` (citizen_reports:read) — pengaduan PENDING/PROCESS tanpa identitas pelapor, dengan transisi yang
  diizinkan dan "perlu perhatian" (lama belum ditangani, tanpa kabar, belum ditanggapi, kategori keamanan).
  Judul/isi/lokasi dari warga ditandai tak tepercaya, NIK/telepon disamarkan, dipotong. Isi laporan bisa menyebut nama
  orang lain: itu risiko yang melekat pada triase teks bebas.
- `propose_report_action` (citizen_reports:**update**) — usulan: ubah status (PROCESS/DONE/REJECT) dan/atau tanggapan untuk
  pelapor. Aturan sama dengan jalur staf mobile (`REPORT_TRANSITIONS`, alasan ≥5 huruf saat menolak, tanggapan hanya pada
  laporan aktif). Eksekusi: update bersyarat pada status lama + baris tanggapan + `AuditLog` (tanpa isi tanggapan) +
  notifikasi warga. Prompt melarang menolak/menutup laporan keselamatan/kekerasan/bencana.

### Pengumuman (`lib/ai/laras-announcement.ts`)

- `announcements_recent` (announcements:read) — 10 pengumuman terbaru + sisa kuota terbit pengguna hari ini.
- `propose_announcement` (announcements:**create**) — judul 3–200, isi 3–4000, kategori baku `Pengumuman|Berita|Event`
  (daftar jalur staf mobile; halaman web memakai set lain `UMUM/KEGIATAN/…` tetapi menampilkan label apa adanya).
- **Tidak ada status draf** di tabel `announcements` (default langsung aktif, daftar admin hanya menampilkan yang aktif), jadi
  konfirmasi = **terbit** ke website desa dan aplikasi warga. Kartu menampilkan isi lengkap dan menyebut dampaknya.
- Notifikasi/push massal ke seluruh warga **sengaja tidak disertakan** (ada batas 3 siaran/hari di jalur mobile); lewat menu
  Pengumuman bila perlu.
- Eksekusi idempoten (judul+isi+penulis sama dalam 15 menit = sudah terbit), kuota harian 10/pengguna ditegakkan ulang saat
  eksekusi, audit tanpa isi. Prompt: tanya dulu bila info belum lengkap; jangan mengarang tanggal/tempat/nominal/nama.

Konfirmasi (`/api/ai/actions/confirm`) memetakan jenis aksi → izin (aksi bisa `create`/`update`) + modul (`REQUIREMENTS` di route). Menambah jenis aksi:
tambah payload di `laras-actions.ts`, modul `lib/ai/laras-<x>.ts` (propose + execute), tool, entri `REQUIREMENTS`, tes.

Prinsip untuk aksi baru: tool tidak pernah mengeksekusi; eksekusi hanya lewat endpoint konfirmasi; identitas diisi server,
bukan model; aksi yang bertanda tangan resmi/keuangan tidak boleh otomatis. Kepala desa (`village_head`) hanya punya
`mail:read` di matriks, jadi belum bisa mengusulkan/mengonfirmasi — ubah di `lib/permissions/matrix.ts` bila ingin.

Keterbatasan v1: kartu hanya muncul pada jawaban langsung (tidak dimuat ulang dari riwayat; teks jawaban tetap ada).

## Pengaman (hasil audit 2026-10-31, tahap 1)

- **Role segar**: `larasCan(session, dbUser.role, …)` dipakai di tool dan konfirmasi. Pola role-dari-JWT di rute lain di
  seluruh aplikasi BELUM diperbaiki (di luar lingkup Laras; perlu keputusan terpisah di `requireVillageApiContext`).
- **Aturan keselamatan di server** (bukan hanya prompt): usulan SETUJUI surat ditolak bila ada peringatan data pemohon
  (NIK tak valid/tak ditemukan, tidak aktif, ganda, keperluan kosong); usulan TOLAK laporan kategori keamanan ditolak;
  menutup laporan keamanan diberi peringatan.
- **Kartu menampilkan bukti** (kutipan tulisan warga) dan hanya langkah berisiko rendah (`batchable` dari server: mulai
  tangani/tanggapan tanpa peringatan) yang boleh dikonfirmasi massal. Persetujuan/penolakan/penerbitan tidak pernah massal.
- **Redaksi PII** (`lib/ai/laras-guard.ts`): NFKC + buang karakter tak terlihat; HP berspasi/strip/+62/kurung; NIK berpemisah
  (berstruktur NIK atau 4-4-4-4, daftar tahun dikecualikan); email; angka setelah "Rp" tidak disentuh. Tetap upaya terbaik:
  nama, alamat, telepon rumah/kantor tidak disamarkan.
- **Teks keluar untuk warga** (`cleanOutbound`): tautan, gambar, dan domain telanjang dibuang + peringatan di kartu; deretan
  angka panjang (mungkin rekening) hanya ditandai.
- **Atomik**: status + tanggapan pengaduan dalam satu transaksi; galat satu token tidak menggagalkan token lain.
- **Performa**: cek kepemilikan thread tanpa memuat pesan; konteks 26→24 query (hapus hitungan ganda, pengaduan via
  `groupBy`); data warga dan cek modul di-cache per pertanyaan; UI mengungkap bahwa pertanyaan diproses penyedia AI pihak ketiga.

## Tahap 2: biaya, kecepatan, retensi

- **Token dicatat dan dibatasi.** `usage` dari penyedia dijumlahkan semua putaran (diperkirakan chars/3,5 bila tidak ada, ditandai
  `tokensEstimated`) dan ditulis ke `AuditLog` (`tokens`, `promptTokens`, `completionTokens`). Batas **harian per pengguna**
  (`lib/ai/token-budget.ts`, jendela 24 jam sejak pemakaian pertama, tabel `mobile_rate_limits`): bawaan 800.000 token,
  ubah dengan env `LARAS_DAILY_TOKEN_CAP` (minimal 10.000). Lewat batas → 429. Kredit tetap flat 1/pertanyaan.
- **Pembatasan per pertanyaan**: riwayat ke model maks. 16.000 karakter (pesan terbaru diutamakan, satu pesan maks. 4.000;
  `lib/ai/history.ts`) dan hasil tool yang menumpuk maks. 30.000 karakter per pertanyaan. Menurunkan selisih biaya terburuk vs biasa.
- **Cache konteks desa** 60 detik per desa per worker (`lib/ai/ttl-cache.ts`, permintaan serentak berbagi satu pemuatan).
  Angka terkini yang tepat tetap lewat tool. Nama pengguna tidak ikut di-cache.
- **Status per langkah (NDJSON)**: klien yang mengirim `Accept: application/x-ndjson` menerima baris `progress` (mis. "Memeriksa data
  keuangan…") lalu satu baris `done`/`error`; tanpa header itu respons tetap satu JSON. Kesalahan sebelum aliran dimulai
  (401/402/429/dst.) tetap JSON. Ini BUKAN streaming token: jawaban sengaja dikirim utuh setelah disanitasi (tautan/gambar/PII),
  disimpan, dan diaudit, sehingga tidak ada teks mentah model yang sampai ke layar atau ke warga sebelum disaring.
  Bila aliran terputus sebelum `done`, UI meminta pengguna membuka ulang riwayat (jawaban mungkin sudah tersimpan).
- **Retensi**: thread yang tidak berubah > 90 hari dihapus job harian `POST /api/cron/ai-retention` (lihat STAGING_GUIDE).

## Tahap 3: red-team dan evaluasi

- **Red-team offline** (`tests/laras-redteam.test.ts`, DB tiruan yang benar-benar memfilter `villageId`: `tests/helpers/fake-db.ts`):
  model diasumsikan SEPENUHNYA dikuasai penyerang. Terbukti di server: usulan/eksekusi tidak menjangkau data desa lain, token milik
  pengguna/desa lain tidak dieksekusi, usulan melanggar aturan (setujui berperingatan, tolak laporan keamanan) ditolak, maks. 10 usulan
  per pertanyaan walau model memanggil 25 kali, argumen berbahaya/aneh (injeksi, tipe salah, polusi prototipe) ditolak, tautan/gambar
  dibuang, dan tidak ada nama/NIK pemohon atau pelapor yang sampai ke model.
- **Evaluasi model asli**: `pnpm laras:eval` (skenario di `lib/ai/eval/scenarios.ts`, pelari di `lib/ai/eval/runner.ts`). Memakai prompt
  sistem dan spesifikasi tool produksi dengan desa rekaan; tool ditiru dengan aturan server yang sama. Pengecekan bertingkat
  **kritis / perilaku / kualitas**. Pelari sendiri diuji dengan model skrip (`tests/laras-eval-harness.test.ts`). Panduan pengujian
  lengkap: [LARAS_TEST_PLAN.md](LARAS_TEST_PLAN.md).
- Catatan: `laras:eval` MEMANGGIL MODEL berbayar memakai `OPENROUTER_API_KEY` dari `.env.local`/`.env`; `--dry-run` tidak memanggil.
  Modul env milik proyek memuat `.env` sendiri sehingga mengosongkan variabel di shell tidak cukup untuk mencegah panggilan.

## Konfigurasi

- `OPENROUTER_ALLOW_DATA_COLLECTION=1` — mematikan `provider.data_collection: "deny"`. Bawaan: deny (penyedia yang
  boleh menyimpan/melatih dari prompt tidak dipakai). Bila model tidak punya penyedia yang memenuhi syarat ini,
  Laras akan gagal dengan "Layanan AI sedang bermasalah"; pantau log `laras upstream error` setelah deploy.
- Bila model tidak mendukung tool, Laras otomatis mencoba ulang tanpa tool (log `laras: model tidak mendukung tool`).

## Belum dikerjakan

- Aksi lain: pembuatan isi surat dari templat, pengingat iuran, notifikasi massal pengumuman (butuh keputusan tersendiri).
- Daftar warga bermasker (nama tersamar) dan tool lain (iuran, absensi, aset, RPJMDes/RKPDes, APBDes rinci).
- Streaming token sungguhan (butuh sanitasi inkremental); kredit proporsional terhadap token; cache bersama antar worker; kuota harian pengumuman masih rawan balapan kecil antar token berbeda.
- Streaming jawaban; cache konteks (kini membaca semua baris warga tiap pertanyaan).
- Set tanya-jawab acuan yang dicocokkan dengan hasil SQL nyata (butuh akses DB); menjalankan `laras:eval` berkala (mis. tiap ganti model/prompt).

## Pengujian

Logika eksekusi (update bersyarat, idempotensi, kuota) diuji tanpa DB dengan menambal delegasi Prisma di memori:
`tests/laras-exec.test.ts`, `tests/laras-announcement-exec.test.ts`. Yang belum teruji: query Prisma sungguhan (groupBy,
relasi) dan perilaku model nyata (kepatuhan prompt, dukungan tool).
