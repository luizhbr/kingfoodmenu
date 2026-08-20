
-- Additive migration: loyalty rewards + configurable loyalty settings
-- Applied idempotently via Prisma Client on 2026-08-20 (statement by statement).

-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "loyaltySettings" JSONB;

-- CreateTable loyalty_rewards
CREATE TABLE IF NOT EXISTS "loyalty_rewards" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "pointsCost" INTEGER NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "loyalty_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable loyalty_redemptions
CREATE TABLE IF NOT EXISTS "loyalty_redemptions" (
  "id" TEXT NOT NULL,
  "rewardId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "pointsCost" INTEGER NOT NULL,
  "couponCode" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "redeemedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loyalty_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_redemptions_couponCode_key" ON "loyalty_redemptions"("couponCode");
CREATE INDEX IF NOT EXISTS "loyalty_redemptions_customerId_idx" ON "loyalty_redemptions"("customerId");

-- AddForeignKey
ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "loyalty_rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loyalty_redemptions" ADD CONSTRAINT "loyalty_redemptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
