-- AlterTable: PrintJob.orderId becomes optional (TEST jobs have no order)
ALTER TABLE "print_jobs" ALTER COLUMN "orderId" DROP NOT NULL;
