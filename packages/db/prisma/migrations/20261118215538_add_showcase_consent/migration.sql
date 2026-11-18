-- AlterEnum
ALTER TYPE "ConsentType" ADD VALUE 'SHOWCASE_PROGRESS';

-- CreateTable
CREATE TABLE "ShowcaseConsent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dietitianId" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT true,
    "includePhotos" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowcaseConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShowcaseConsent_dietitianId_idx" ON "ShowcaseConsent"("dietitianId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowcaseConsent_clientId_dietitianId_key" ON "ShowcaseConsent"("clientId", "dietitianId");

-- AddForeignKey
ALTER TABLE "ShowcaseConsent" ADD CONSTRAINT "ShowcaseConsent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseConsent" ADD CONSTRAINT "ShowcaseConsent_dietitianId_fkey" FOREIGN KEY ("dietitianId") REFERENCES "DietitianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
