-- CreateTable
CREATE TABLE "public"."WishImage" (
    "id" TEXT NOT NULL,
    "wishId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "WishImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WishImage_key_key" ON "public"."WishImage"("key");

-- CreateIndex
CREATE INDEX "WishImage_wishId_position_idx" ON "public"."WishImage"("wishId", "position");

-- AddForeignKey
ALTER TABLE "public"."WishImage" ADD CONSTRAINT "WishImage_wishId_fkey" FOREIGN KEY ("wishId") REFERENCES "public"."Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
