-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CLIENT_LOG_SUBMITTED';

-- CreateTable
CREATE TABLE "ClientLogRecord" (
    "id" SERIAL NOT NULL,
    "playId" INTEGER NOT NULL,
    "contentId" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLogRecord_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClientLogRecord" ADD CONSTRAINT "ClientLogRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
