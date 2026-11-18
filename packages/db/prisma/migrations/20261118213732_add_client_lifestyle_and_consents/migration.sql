-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('PRIVACY_NOTICE', 'TERMS_OF_SERVICE', 'HEALTH_DATA_EXPLICIT');

-- AlterTable
ALTER TABLE "ClientProfile" ADD COLUMN     "allergies" TEXT[],
ADD COLUMN     "city" TEXT,
ADD COLUMN     "currentWeightKg" DECIMAL(65,30),
ADD COLUMN     "dietaryPreferences" TEXT[],
ADD COLUMN     "hobbies" TEXT[],
ADD COLUMN     "maxBudgetTry" INTEGER,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "preferredSessionMode" "SessionMode",
ADD COLUMN     "sports" TEXT[],
ADD COLUMN     "targetWeightKg" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "DietitianProfile" ADD COLUMN     "city" TEXT;

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentRecord_userId_type_idx" ON "ConsentRecord"("userId", "type");

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
