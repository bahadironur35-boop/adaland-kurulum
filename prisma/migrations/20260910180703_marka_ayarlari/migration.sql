-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "careReminders" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "childName" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "installedAt" TIMESTAMP(3),
ADD COLUMN     "siteName" TEXT;
