-- AlterTable
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "visualDraft" JSONB,
ADD COLUMN IF NOT EXISTS "visualPublished" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "design_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "configuration" JSONB NOT NULL,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "design_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "design_versions_version_key" ON "design_versions"("version");
