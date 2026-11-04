-- Rollback Paket 10: hapus indeks urutan bawaan daftar warga (aman; hanya memperlambat daftar warga desa besar).
DROP INDEX `residents_villageId_createdAt_idx` ON `residents`;
