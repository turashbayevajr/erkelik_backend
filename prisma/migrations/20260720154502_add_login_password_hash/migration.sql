-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "login" TEXT,
ADD COLUMN     "passwordHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "public"."User"("login");

