-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "lastBackupAt" TIMESTAMP(3),
ADD COLUMN     "lastCareReminderAt" TIMESTAMP(3),
ADD COLUMN     "lastYearbookYear" INTEGER;
