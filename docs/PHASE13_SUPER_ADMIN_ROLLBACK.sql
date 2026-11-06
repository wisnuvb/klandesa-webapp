-- DropForeignKey
ALTER TABLE `platform_auth_tokens` DROP FOREIGN KEY `platform_auth_tokens_platformUserId_fkey`;

-- DropIndex
DROP INDEX `billing_invoices_status_paidAt_idx` ON `billing_invoices`;

-- AlterTable
ALTER TABLE `platform_users` DROP COLUMN `recoveryCodeHashes`,
    DROP COLUMN `totpEnabledAt`,
    DROP COLUMN `totpSecretEnc`;

-- DropTable
DROP TABLE `platform_auth_tokens`;

-- DropTable
DROP TABLE `platform_audit_logs`;

