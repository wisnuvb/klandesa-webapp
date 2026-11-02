-- Paket 5 / Cermin data pangan SP2KP. ADITIF: 2 tabel baru (daftar kab/kota Kemendag, snapshot harga/HET + riwayat).
-- Tidak mengubah atau menghapus data lama. Rollback: PHASE5_PANGAN_ROLLBACK.sql.

-- CreateTable
CREATE TABLE `pangan_wilayah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kodeProvinsi` VARCHAR(2) NOT NULL,
    `kodeKabKota` VARCHAR(4) NOT NULL,
    `nama` VARCHAR(160) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `fetchedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pangan_wilayah_kodeProvinsi_isActive_idx`(`kodeProvinsi`, `isActive`),
    UNIQUE INDEX `pangan_wilayah_unique`(`kodeProvinsi`, `kodeKabKota`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pangan_harga_snapshots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(8) NOT NULL,
    `kodeProvinsi` VARCHAR(2) NOT NULL DEFAULT '',
    `kodeKabKota` VARCHAR(4) NOT NULL DEFAULT '',
    `tanggal` VARCHAR(10) NOT NULL,
    `tanggalPembanding` VARCHAR(10) NOT NULL DEFAULT '',
    `payload` JSON NOT NULL,
    `hasData` BOOLEAN NOT NULL DEFAULT false,
    `fetchedAt` DATETIME(3) NOT NULL,
    `lastAttemptAt` DATETIME(3) NULL,
    `lastError` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pangan_harga_snapshots_kind_kodeKabKota_tanggal_idx`(`kind`, `kodeKabKota`, `tanggal`),
    INDEX `pangan_harga_snapshots_tanggal_idx`(`tanggal`),
    UNIQUE INDEX `pangan_snapshot_unique`(`kind`, `kodeProvinsi`, `kodeKabKota`, `tanggal`, `tanggalPembanding`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

