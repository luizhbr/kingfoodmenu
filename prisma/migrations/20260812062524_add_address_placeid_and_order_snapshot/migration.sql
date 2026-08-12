-- AlterTable
ALTER TABLE "addresses" ADD COLUMN     "formattedAddress" TEXT,
ADD COLUMN     "placeId" TEXT,
ALTER COLUMN "customerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryCity" TEXT,
ADD COLUMN     "deliveryCountry" TEXT DEFAULT 'US',
ADD COLUMN     "deliveryFormattedAddress" TEXT,
ADD COLUMN     "deliveryLat" DOUBLE PRECISION,
ADD COLUMN     "deliveryLine1" TEXT,
ADD COLUMN     "deliveryLine2" TEXT,
ADD COLUMN     "deliveryLng" DOUBLE PRECISION,
ADD COLUMN     "deliveryPlaceId" TEXT,
ADD COLUMN     "deliveryPostalCode" TEXT,
ADD COLUMN     "deliveryState" TEXT;
