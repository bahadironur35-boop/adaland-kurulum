/*
  Warnings:

  - You are about to drop the column `lastYearbookYear` on the `Settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "lastYearbookYear",
ADD COLUMN     "lastYearbookAge" INTEGER;
