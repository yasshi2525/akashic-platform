-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CLIENT_LOG_SUBMITTED';

-- CreateTable
CREATE TABLE "ClientLogRecord" (
    "id" SERIAL NOT NULL,
    "playId" INTEGER NOT NULL,
    "contentId" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "errorMessage" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLogRecord_pkey" PRIMARY KEY ("id")
);
