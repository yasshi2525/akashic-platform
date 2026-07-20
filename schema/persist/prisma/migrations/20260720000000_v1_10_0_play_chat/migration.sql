-- AlterTable
ALTER TABLE "Play" ADD COLUMN     "chatEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlayChatMessage" (
    "id" SERIAL NOT NULL,
    "playId" INTEGER NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "guestId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlayChatMessage_playId_id_idx" ON "PlayChatMessage"("playId", "id");

-- CreateIndex
CREATE INDEX "PlayChatMessage_playId_authorId_createdAt_idx" ON "PlayChatMessage"("playId", "authorId", "createdAt");

-- CreateIndex
CREATE INDEX "PlayChatMessage_playId_guestId_createdAt_idx" ON "PlayChatMessage"("playId", "guestId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlayChatMessage" ADD CONSTRAINT "PlayChatMessage_playId_fkey" FOREIGN KEY ("playId") REFERENCES "Play"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayChatMessage" ADD CONSTRAINT "PlayChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
