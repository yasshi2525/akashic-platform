-- CreateEnum
CREATE TYPE "BanOrigin" AS ENUM ('MANUAL', 'VIA_BLOCK');

-- CreateTable
CREATE TABLE "Ban" (
    "id" SERIAL NOT NULL,
    "gmUserId" TEXT,
    "gmGuestId" TEXT,
    "playId" INTEGER,
    "targetUserId" TEXT,
    "targetGuestId" TEXT,
    "origin" "BanOrigin" NOT NULL DEFAULT 'MANUAL',
    "labelSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaySession" (
    "id" SERIAL NOT NULL,
    "playId" INTEGER NOT NULL,
    "viewerId" TEXT NOT NULL,
    "playToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ban_gmUserId_idx" ON "Ban"("gmUserId");

-- CreateIndex
CREATE INDEX "Ban_playId_idx" ON "Ban"("playId");

-- CreateIndex
CREATE INDEX "Ban_targetUserId_idx" ON "Ban"("targetUserId");

-- CreateIndex
CREATE INDEX "Ban_targetGuestId_idx" ON "Ban"("targetGuestId");

-- CreateIndex
CREATE INDEX "PlaySession_playId_viewerId_idx" ON "PlaySession"("playId", "viewerId");

-- AddForeignKey
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_gmUserId_fkey" FOREIGN KEY ("gmUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaySession" ADD CONSTRAINT "PlaySession_playId_fkey" FOREIGN KEY ("playId") REFERENCES "Play"("id") ON DELETE CASCADE ON UPDATE CASCADE;
