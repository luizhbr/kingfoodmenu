-- AlterTable: adiciona galeria multi-foto no MenuItem (retrocompatível)
-- images = JSON [{ url, sortOrder, isPrimary }] | NULL = produto antigo (usa image)
ALTER TABLE "menu_items" ADD COLUMN "images" JSONB;
