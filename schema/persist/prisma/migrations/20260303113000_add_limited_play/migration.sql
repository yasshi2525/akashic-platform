-- AlterTable
ALTER TABLE "Play"
ADD COLUMN "isLimited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "joinWordHash" TEXT,
ADD COLUMN "inviteHash" TEXT;
