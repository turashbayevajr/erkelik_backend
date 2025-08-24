-- CreateEnum
CREATE TYPE "public"."WishlistStatus" AS ENUM ('OPEN', 'RESERVED', 'ORDERED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "public"."Locale" AS ENUM ('EN', 'RU', 'KK');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "preferredLocale" "public"."Locale" NOT NULL DEFAULT 'EN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Wishlist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "url" TEXT,
    "ownerId" INTEGER NOT NULL,
    "orderedById" INTEGER,
    "status" "public"."WishlistStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "public"."User"("telegramId");

-- CreateIndex
CREATE INDEX "Wishlist_ownerId_idx" ON "public"."Wishlist"("ownerId");

-- CreateIndex
CREATE INDEX "Wishlist_orderedById_idx" ON "public"."Wishlist"("orderedById");

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_ownerId_name_url_key" ON "public"."Wishlist"("ownerId", "name", "url");

-- AddForeignKey
ALTER TABLE "public"."Wishlist" ADD CONSTRAINT "Wishlist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Wishlist" ADD CONSTRAINT "Wishlist_orderedById_fkey" FOREIGN KEY ("orderedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
