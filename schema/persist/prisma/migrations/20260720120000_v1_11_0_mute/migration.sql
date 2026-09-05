-- CreateTable
CREATE TABLE "Mute" (
    "id" SERIAL NOT NULL,
    "ownerId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetGuestId" TEXT,
    "labelSnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mute_ownerId_idx" ON "Mute"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Mute_ownerId_targetUserId_key" ON "Mute"("ownerId", "targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Mute_ownerId_targetGuestId_key" ON "Mute"("ownerId", "targetGuestId");

-- AddForeignKey
ALTER TABLE "Mute" ADD CONSTRAINT "Mute_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mute" ADD CONSTRAINT "Mute_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
