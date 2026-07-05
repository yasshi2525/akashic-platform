-- CreateTable
CREATE TABLE "BoardMessage" (
    "id" SERIAL NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "guestId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardMessage_createdAt_idx" ON "BoardMessage"("createdAt");

-- CreateIndex
CREATE INDEX "BoardMessage_guestId_createdAt_idx" ON "BoardMessage"("guestId", "createdAt");

-- AddForeignKey
ALTER TABLE "BoardMessage" ADD CONSTRAINT "BoardMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
