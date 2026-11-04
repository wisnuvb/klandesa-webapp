-- AlterTable
-- Penyesuaian izin per akun desa (grant/deny di atas bawaan role). NULL = ikut bawaan role.
ALTER TABLE `users` ADD COLUMN `permissionOverrides` JSON NULL;

-- AlterTable
-- Tautan opsional perangkat desa -> akun login.
ALTER TABLE `officials` ADD COLUMN `userId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `officials_userId_key` ON `officials`(`userId`);

-- AddForeignKey
ALTER TABLE `officials` ADD CONSTRAINT `officials_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
