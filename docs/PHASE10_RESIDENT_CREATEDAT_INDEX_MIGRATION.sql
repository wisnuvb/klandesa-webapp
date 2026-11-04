-- Paket 10 / indeks urutan bawaan daftar warga. ADITIF (hanya indeks; tanpa perubahan kolom/data).
-- Terukur di desa 50.000 warga: halaman pertama daftar warga 114 ms -> 0,08 ms (sebelumnya membaca semua baris desa + filesort).
-- InnoDB membuat indeks secara ONLINE (DML tidak terkunci), tetapi tetap jalankan di jam sepi untuk tabel `residents` yang besar.
-- Identik dengan `prisma db push` (nama default Prisma). Rollback: PHASE10_RESIDENT_CREATEDAT_INDEX_ROLLBACK.sql.

CREATE INDEX `residents_villageId_createdAt_idx` ON `residents`(`villageId`, `createdAt` DESC);
