-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guestCustomerEmail" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guestCustomerName" TEXT;
