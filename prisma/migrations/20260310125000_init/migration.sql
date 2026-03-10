-- CreateTable
CREATE TABLE `Registration` (
    `id` VARCHAR(191) NOT NULL,
    `eventCode` VARCHAR(191) NOT NULL DEFAULT 'default',
    `fullName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `organization` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `status` ENUM('PENDING_TELEGRAM', 'TELEGRAM_LINKED', 'TICKET_SENT', 'CHECKED_IN') NOT NULL DEFAULT 'PENDING_TELEGRAM',
    `telegramLinkToken` VARCHAR(191) NOT NULL,
    `telegramLinkExpiresAt` DATETIME(3) NOT NULL,
    `telegramLinkedAt` DATETIME(3) NULL,
    `telegramUserId` VARCHAR(191) NULL,
    `telegramUsername` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Registration_telegramLinkToken_key`(`telegramLinkToken`),
    INDEX `Registration_email_idx`(`email`),
    INDEX `Registration_telegramUserId_idx`(`telegramUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ticket` (
    `id` VARCHAR(191) NOT NULL,
    `registrationId` VARCHAR(191) NOT NULL,
    `ticketCode` VARCHAR(191) NOT NULL,
    `qrPayload` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `checkedInAt` DATETIME(3) NULL,
    `checkedInBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ticket_registrationId_key`(`registrationId`),
    UNIQUE INDEX `Ticket_ticketCode_key`(`ticketCode`),
    UNIQUE INDEX `Ticket_qrPayload_key`(`qrPayload`),
    INDEX `Ticket_checkedInAt_idx`(`checkedInAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheckInLog` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NULL,
    `registrationId` VARCHAR(191) NULL,
    `attemptedValue` TEXT NOT NULL,
    `scannerName` VARCHAR(191) NULL,
    `scannerIp` VARCHAR(191) NULL,
    `status` ENUM('SUCCESS', 'DUPLICATE', 'INVALID', 'NOT_FOUND', 'ERROR') NOT NULL,
    `reason` VARCHAR(191) NULL,
    `attemptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CheckInLog_attemptedAt_idx`(`attemptedAt`),
    INDEX `CheckInLog_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_registrationId_fkey` FOREIGN KEY (`registrationId`) REFERENCES `Registration`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckInLog` ADD CONSTRAINT `CheckInLog_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckInLog` ADD CONSTRAINT `CheckInLog_registrationId_fkey` FOREIGN KEY (`registrationId`) REFERENCES `Registration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
