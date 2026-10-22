-- CreateTable
CREATE TABLE `mobile_rate_limits` (
    `key` VARCHAR(120) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `windowStart` DATETIME(3) NOT NULL,

    INDEX `mobile_rate_limits_windowStart_idx`(`windowStart`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

