-- GDPR account deletion: customers are anonymised in place; this marks when.
ALTER TABLE "customers" ADD COLUMN "deletedAt" TIMESTAMP(3);
