-- CreateTable
CREATE TABLE "option_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayType" "MenuOptionDisplayType" NOT NULL DEFAULT 'SELECT',
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "option_group_values" (
    "id" TEXT NOT NULL,
    "optionGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceModifier" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "option_group_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_option_groups" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "optionGroupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "menu_item_option_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_option_groups_menuItemId_optionGroupId_key" ON "menu_item_option_groups"("menuItemId", "optionGroupId");

-- AddForeignKey
ALTER TABLE "option_group_values" ADD CONSTRAINT "option_group_values_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "option_groups"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_option_groups" ADD CONSTRAINT "menu_item_option_groups_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "option_groups"("id") ON DELETE CASCADE;

-- Migration script: copy existing MenuOption+MenuOptionValue into OptionGroup+OptionGroupValue
-- and create MenuItemOptionGroup links
INSERT INTO "option_groups" ("id", "name", "displayType", "isRequired", "minSelect", "maxSelect", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
  mo."id",
  mo."name",
  mo."displayType",
  mo."isRequired",
  mo."minSelect",
  mo."maxSelect",
  mo."sortOrder",
  true,
  NOW(),
  NOW()
FROM "menu_options" mo;

INSERT INTO "option_group_values" ("id", "optionGroupId", "name", "priceModifier", "isDefault", "sortOrder", "createdAt", "updatedAt")
SELECT
  mov."id",
  mov."menuOptionId",
  mov."name",
  mov."priceModifier",
  mov."isDefault",
  mov."sortOrder",
  NOW(),
  NOW()
FROM "menu_option_values" mov;

INSERT INTO "menu_item_option_groups" ("id", "menuItemId", "optionGroupId", "sortOrder")
SELECT
  REPLACE(CAST(gen_random_uuid() AS TEXT), '-', ''),
  mo."menuItemId",
  mo."id",
  mo."sortOrder"
FROM "menu_options" mo;
