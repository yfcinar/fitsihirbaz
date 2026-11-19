-- AlterTable
ALTER TABLE "DietPlanMeal" ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "DietPlanTemplate" (
    "id" TEXT NOT NULL,
    "dietitianId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetCalories" INTEGER,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietPlanTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DietPlanTemplate_dietitianId_idx" ON "DietPlanTemplate"("dietitianId");

-- AddForeignKey
ALTER TABLE "DietPlanTemplate" ADD CONSTRAINT "DietPlanTemplate_dietitianId_fkey" FOREIGN KEY ("dietitianId") REFERENCES "DietitianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
