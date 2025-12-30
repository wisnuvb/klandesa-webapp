-- AlterTable
ALTER TABLE `residents` ADD COLUMN `contraception` VARCHAR(100) NULL,
    ADD COLUMN `countryCode` VARCHAR(10) NULL,
    ADD COLUMN `cover` TEXT NULL,
    ADD COLUMN `coverThumb` TEXT NULL,
    ADD COLUMN `datePregnant` DATETIME(3) NULL,
    ADD COLUMN `desil` VARCHAR(50) NULL,
    ADD COLUMN `disabilityId` INTEGER NULL,
    ADD COLUMN `fatherName` VARCHAR(255) NULL,
    ADD COLUMN `fatherNik` VARCHAR(16) NULL,
    ADD COLUMN `height` INTEGER NULL,
    ADD COLUMN `houseOwnership` VARCHAR(100) NULL,
    ADD COLUMN `income` INTEGER NULL,
    ADD COLUMN `isBpjsKis` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `isBreastfeeding` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `isDisability` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `isIlliterate` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `isPregnant` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `isStunting` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `motherName` VARCHAR(255) NULL,
    ADD COLUMN `motherNik` VARCHAR(16) NULL,
    ADD COLUMN `otherDisability` VARCHAR(255) NULL,
    ADD COLUMN `photo` TEXT NULL,
    ADD COLUMN `photoThumb` TEXT NULL,
    ADD COLUMN `tempIdNumber` VARCHAR(20) NULL,
    ADD COLUMN `tempRt` VARCHAR(10) NULL,
    ADD COLUMN `weight` INTEGER NULL;

-- CreateTable
CREATE TABLE `village_potentials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` VARCHAR(4) NOT NULL,
    `population` INTEGER NOT NULL,
    `households` INTEGER NOT NULL,
    `area` DOUBLE NOT NULL,
    `agricultureLand` DOUBLE NOT NULL,
    `plantationLand` DOUBLE NOT NULL,
    `forestArea` DOUBLE NOT NULL,
    `educationFacilities` INTEGER NOT NULL DEFAULT 0,
    `healthFacilities` INTEGER NOT NULL DEFAULT 0,
    `tourismSpots` INTEGER NOT NULL DEFAULT 0,
    `waterResources` TEXT NULL,
    `economicPotential` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `village_potentials_villageId_year_idx`(`villageId`, `year`),
    UNIQUE INDEX `village_potentials_villageId_year_key`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `village_potentials` ADD CONSTRAINT `village_potentials_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
