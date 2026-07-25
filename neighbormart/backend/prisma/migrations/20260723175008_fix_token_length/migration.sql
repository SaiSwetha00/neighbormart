-- AlterTable
ALTER TABLE `sessions` MODIFY `token` VARCHAR(512) NOT NULL,
    MODIFY `device` VARCHAR(512) NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `email` VARCHAR(320) NOT NULL,
    MODIFY `password` VARCHAR(256) NOT NULL;
