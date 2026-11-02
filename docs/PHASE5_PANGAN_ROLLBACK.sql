-- Rollback Paket 5 / Cermin data pangan SP2KP. Hanya membuang 2 tabel cermin; semua isinya bisa diisi ulang oleh cron sync-pangan.
DROP TABLE IF EXISTS `pangan_harga_snapshots`;
DROP TABLE IF EXISTS `pangan_wilayah`;
