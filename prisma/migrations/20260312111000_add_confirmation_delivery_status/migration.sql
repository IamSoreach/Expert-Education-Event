-- AlterTable
ALTER TABLE `Registration`
    ADD COLUMN `confirmationStatus` ENUM('PENDING', 'SENT', 'INVALID') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `confirmationSentAt` DATETIME(3) NULL,
    ADD COLUMN `confirmationError` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Registration_confirmationStatus_idx` ON `Registration`(`confirmationStatus`);
