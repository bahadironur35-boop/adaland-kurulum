-- CreateTable
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "openAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recordedAt" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "durationSec" INTEGER,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "addedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Letter_openAt_idx" ON "Letter"("openAt");

-- CreateIndex
CREATE UNIQUE INDEX "Recording_path_key" ON "Recording"("path");

-- CreateIndex
CREATE INDEX "Recording_recordedAt_idx" ON "Recording"("recordedAt");

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
