-- DropForeignKey
ALTER TABLE `CheckInLog` DROP FOREIGN KEY `CheckInLog_registrationId_fkey`;

-- DropForeignKey
ALTER TABLE `CheckInLog` DROP FOREIGN KEY `CheckInLog_ticketId_fkey`;

-- DropIndex
DROP INDEX `Registration_email_idx` ON `Registration`;

-- DropIndex
DROP INDEX `Registration_telegramLinkToken_key` ON `Registration`;

-- DropIndex
DROP INDEX `Registration_telegramUserId_idx` ON `Registration`;

-- DropIndex
DROP INDEX `Ticket_qrPayload_key` ON `Ticket`;

-- AlterTable
ALTER TABLE `Registration` DROP COLUMN `email`,
    DROP COLUMN `eventCode`,
    DROP COLUMN `fullName`,
    DROP COLUMN `notes`,
    DROP COLUMN `organization`,
    DROP COLUMN `phone`,
    DROP COLUMN `telegramLinkExpiresAt`,
    DROP COLUMN `telegramLinkToken`,
    DROP COLUMN `telegramLinkedAt`,
    DROP COLUMN `telegramUserId`,
    DROP COLUMN `telegramUsername`,
    ADD COLUMN `eventId` VARCHAR(191) NOT NULL,
    ADD COLUMN `participantId` VARCHAR(191) NOT NULL,
    ADD COLUMN `source` VARCHAR(64) NULL,
    MODIFY `status` ENUM('PENDING', 'LINKED', 'TICKET_SENT', 'CHECKED_IN', 'CANCELLED') NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `Ticket` DROP COLUMN `checkedInBy`,
    ADD COLUMN `qrImagePath` VARCHAR(255) NULL,
    ADD COLUMN `revokedAt` DATETIME(3) NULL,
    MODIFY `ticketCode` VARCHAR(64) NOT NULL,
    MODIFY `qrPayload` TEXT NOT NULL;

-- DropTable
DROP TABLE `CheckInLog`;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `venue` VARCHAR(191) NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Event_code_key`(`code`),
    INDEX `Event_isActive_startAt_idx`(`isActive`, `startAt`),
    INDEX `Event_startAt_idx`(`startAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Participant` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(40) NOT NULL,
    `email` VARCHAR(191) NULL,
    `organization` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `telegramUserId` VARCHAR(64) NULL,
    `telegramChatId` VARCHAR(64) NULL,
    `telegramUsername` VARCHAR(191) NULL,
    `telegramFirstName` VARCHAR(191) NULL,
    `telegramLastName` VARCHAR(191) NULL,
    `telegramLinkedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Participant_telegramUserId_key`(`telegramUserId`),
    INDEX `Participant_phoneNumber_idx`(`phoneNumber`),
    INDEX `Participant_email_idx`(`email`),
    INDEX `Participant_telegramChatId_idx`(`telegramChatId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TelegramLinkToken` (
    `id` VARCHAR(191) NOT NULL,
    `registrationId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TelegramLinkToken_token_key`(`token`),
    INDEX `TelegramLinkToken_registrationId_idx`(`registrationId`),
    INDEX `TelegramLinkToken_expiresAt_idx`(`expiresAt`),
    INDEX `TelegramLinkToken_consumedAt_idx`(`consumedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ScanLog` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NULL,
    `scannedCode` TEXT NOT NULL,
    `result` ENUM('VALID', 'DUPLICATE', 'INVALID', 'REVOKED') NOT NULL,
    `operatorLabel` VARCHAR(120) NULL,
    `deviceLabel` VARCHAR(120) NULL,
    `scannedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,

    INDEX `ScanLog_ticketId_idx`(`ticketId`),
    INDEX `ScanLog_result_idx`(`result`),
    INDEX `ScanLog_scannedAt_idx`(`scannedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Registration_eventId_status_idx` ON `Registration`(`eventId`, `status`);

-- CreateIndex
CREATE INDEX `Registration_participantId_idx` ON `Registration`(`participantId`);

-- CreateIndex
CREATE INDEX `Registration_status_idx` ON `Registration`(`status`);

-- CreateIndex
CREATE UNIQUE INDEX `Registration_eventId_participantId_key` ON `Registration`(`eventId`, `participantId`);

-- CreateIndex
CREATE INDEX `Ticket_revokedAt_idx` ON `Ticket`(`revokedAt`);

-- AddForeignKey
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Registration` ADD CONSTRAINT `Registration_participantId_fkey` FOREIGN KEY (`participantId`) REFERENCES `Participant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TelegramLinkToken` ADD CONSTRAINT `TelegramLinkToken_registrationId_fkey` FOREIGN KEY (`registrationId`) REFERENCES `Registration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScanLog` ADD CONSTRAINT `ScanLog_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
