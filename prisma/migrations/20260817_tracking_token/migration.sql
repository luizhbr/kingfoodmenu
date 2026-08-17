-- Additive migration: trackingToken for guest order tracking.
-- Applied directly to Neon production (P3005 pattern) on 2026-08-17.
-- Matches schema.prisma: trackingToken String?  @unique

-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "trackingToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "orders_trackingToken_key" ON "orders"("trackingToken");
