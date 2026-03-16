-- AlterTable
ALTER TABLE "Play"
ADD COLUMN     "inviteHash" TEXT,
ADD COLUMN     "isLimited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "joinWord" TEXT;
