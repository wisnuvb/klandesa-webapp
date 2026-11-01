-- Rollback Fase 1 butir 3 (APB Desa): menghapus lima tabel baru saja. Urutan memperhatikan kunci asing.
DROP TABLE `apbdes_lines`;
DROP TABLE `apbdes_documents`;
DROP TABLE `apbdes_entries`;
DROP TABLE `apbdes_month_closes`;
DROP TABLE `apbdes_years`;
