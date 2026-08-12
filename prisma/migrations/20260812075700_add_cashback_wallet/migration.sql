-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CashbackTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REVERSAL', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "cashback_wallets" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashback_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cashback_wallets_customerId_key" ON "cashback_wallets"("customerId");

-- CreateTable
CREATE TABLE "cashback_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "CashbackTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "orderId" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashback_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cashback_transactions_type_referenceId_key" ON "cashback_transactions"("type", "referenceId");

-- CreateIndex
CREATE INDEX "cashback_transactions_customerId_idx" ON "cashback_transactions"("customerId");

-- CreateIndex
CREATE INDEX "cashback_transactions_walletId_idx" ON "cashback_transactions"("walletId");

-- CreateIndex
CREATE INDEX "cashback_transactions_orderId_idx" ON "cashback_transactions"("orderId");

-- AddForeignKey
ALTER TABLE "cashback_wallets" ADD CONSTRAINT "cashback_wallets_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_transactions" ADD CONSTRAINT "cashback_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "cashback_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_transactions" ADD CONSTRAINT "cashback_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_transactions" ADD CONSTRAINT "cashback_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
